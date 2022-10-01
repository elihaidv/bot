const Binance = require('node-binance-api');
require('dotenv').config({ path: '../.env' })
const cancelOrders = require('./CancelOrders');
import { DirectionTrader } from './Workers/DirectionTrader';
import { DualBot } from './Workers/DualBot';
import { FutureTrader } from './Workers/FuturesTrader';
import { Bot, Key } from './Models'
// import { OrderPlacer } from './PlaceOrders';
import { Sockets } from './Sockets/Sockets';
import { SocketsFutures } from './Sockets/SocketsFuture';
import { WeightAvg } from './Workers/WeightAvg';
import { DAL } from './DAL';
import { Periodically } from './Workers/Periodically';
import { SignaligProcessor, SignalingPlacer } from './Workers/SignaligProcessor';
const express = require('express')
var bodyParser = require('body-parser')
var https = require('https');
var http = require('http');
var fs = require('fs');


let exchangeInfo, futuresExchangeInfo

let bots = new Array<Bot>()



async function run() {

  Binance().exchangeInfo().then(data => exchangeInfo = data)
  Binance().futuresExchangeInfo().then(data => {
    futuresExchangeInfo = data
    SignaligProcessor.instance.futuresExchangeInfo = data
    console.log("futuresExchangeInfo loaded")
  })

  await DAL.instance.init()
  execute()

  createServer()
}
run()

async function execute() {
  try {
    let botsResults = await DAL.instance.getBots()

    let keys: Array<Key> = await DAL.instance.getKeys()

    initBots(botsResults)

    Sockets.getInstance().updateSockets(Array.from(bots.filter(b => !b.isFuture)), keys)
    SocketsFutures.getFInstance().updateSockets(Array.from(bots.filter(b => b.isFuture)), keys)

    SignaligProcessor.instance.setBots(Array.from(bots.filter(b => b.bot_type_id == "7")))

    let outdatedBots: Array<Bot> = filterOutdated(bots)

    if (exchangeInfo && futuresExchangeInfo) {


      await Promise.all(outdatedBots.map((b) => cancelOrders(b)));

      await Sockets.getInstance().timeout(1000)

      await Promise.all(outdatedBots.map((b) => {
        switch (b.bot_type_id) {
          // case "1":
          //   return new OrderPlacer(b, exchangeInfo).place();
          case "2":
            return new WeightAvg(b, exchangeInfo).place();
          case "3":
            return new FutureTrader(b, futuresExchangeInfo).place();
          case "4":
            return new DualBot(b, futuresExchangeInfo).place()
          case "5":
            return new DirectionTrader(b, futuresExchangeInfo).place()
          case "6":
            return new Periodically(b, exchangeInfo).place()
          case "7":
            return new SignalingPlacer(b, exchangeInfo).place()


        }
      }))
    }

  } catch (e) {
    console.log(e)
  }
  setTimeout(execute, 3000)
}


function filterOutdated(bots: Array<Bot>): Array<Bot> {
  return bots.filter(b => {

    const PAIR = b.coin1 + b.coin2 + b.positionSide()
    if (b.binance && b.binance!.orders && b.binance!.orders.changed.includes(PAIR)) {
      b.binance!.orders.changed = b.binance!.orders.changed.filter(p => p != PAIR)
      return true
    }
    if (b.signalings && b.binance && b.binance!.orders) {
      for (let s of b.signalings) {
        if (b.binance!.orders.changed.includes(s.coin1 + s.coin2 + b.positionSide())) {
          return true
        }
      }
    }
    if (b.lastOrder == Bot.STABLE) return false
    return !b.lastOrder || new Date().getTime() - b.lastOrder >= b.secound * 1000
  })
}

async function initBots(botsResults) {
  let newBots = new Array<Bot>()

  for (let bot of botsResults) {
    const oldBot = bots.find(b => b.id() == bot._id.toString())
    if (oldBot) {
      newBots.push(Object.assign(oldBot, bot))
    } else {
      newBots.push(Object.assign(new Bot(), bot))

    }
  }

  bots = newBots
}

function createServer() {


  const app = express()
  app.use(bodyParser.urlencoded({ extended: false }))

  app.use(bodyParser.json())

  app.post('/', (req, res) => {
      SignaligProcessor.instance.proccessTextSignal(req.body.message)

      console.log(JSON.stringify(req.body))
      res.send('Hello World!')
  })

  http.createServer(app).listen(8081);

  if (fs.existsSync('/etc/letsencrypt/live/itamars.live/fullchain.pem')) {
      var options = {

          cert: fs.readFileSync('/etc/letsencrypt/live/itamars.live/fullchain.pem'),
          key: fs.readFileSync('/etc/letsencrypt/live/itamars.live/privkey.pem')
      };
      https.createServer(options, app).listen(8443);
  }
  console.log("Server started")
}
