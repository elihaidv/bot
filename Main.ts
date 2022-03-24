const Binance = require('node-binance-api');
const { MongoClient } = require("mongodb");
require('dotenv').config({ path: '../.env' })
const cancelOrders = require('./CancelOrders');
const DB = require('./DB')

import { DualBot } from './DualBot';
import { FutureTrader } from './FuturesTrader';
import { Bot, Key } from './Models'
import { OrderPlacer } from './PlaceOrders';
import { Sockets } from './Sockets';
import { SocketsFutures } from './SocketsFuture';
import { WeightAvg } from './WeightAvg';

const uri = DB.USERNAME ?
  `mongodb://${DB.USERNAME}:${DB.PASSWORD}@${DB.ADDRESS}?writeConcern=majority` :
  `mongodb://127.0.0.1:27017/trading_bot?writeConcern=majority`;

let exchangeInfo, futuresExchangeInfo;
export let dbo

let bots = new Array<Bot>()



async function run() {

  Binance().exchangeInfo().then(data => exchangeInfo = data)
  Binance().futuresExchangeInfo().then(data => futuresExchangeInfo = data)

  let db = await MongoClient.connect(uri)
  dbo = db.db("trading_bot")

  execute()

}
run()

async function execute() {
  try {
    let botsResults = await dbo.collection('bot').find({ run: true, stream: '1', enviroment: DB.ENVIROMENT }).toArray()
    let keys: Array<Key> = await dbo.collection('key').find({}).toArray()

    initBots(botsResults)

    Sockets.getInstance().updateSockets(Array.from(bots.filter(b => !b.isFuture)), keys)
    SocketsFutures.getFInstance().updateSockets(Array.from(bots.filter(b => b.isFuture)), keys)

    let outdatedBots: Array<Bot> = filterOutdated(bots)

    if (exchangeInfo && futuresExchangeInfo) {

      await Promise.all(outdatedBots.map(cancelOrders));
      await Promise.all(outdatedBots.map((b) => {
        switch (b.bot_type_id) {
          case "1":
            return new OrderPlacer(b, exchangeInfo).place();
          case "2":
            return new WeightAvg(b, exchangeInfo).place();
          case "3":
            return new FutureTrader(b, futuresExchangeInfo).place();
          case "4":
            return new DualBot(b, futuresExchangeInfo).place()

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

