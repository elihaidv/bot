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
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import { OneStep } from './Workers/OneStep';
import { OrderPlacer } from './Workers/PlaceOrders';


let exchangeInfo, futuresExchangeInfo, first = true

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

      if (first) {
        bots.filter(b => b.bot_type_id == "7").forEach(b =>
          b.signalings.forEach(s =>
            b.binance?.orders.changed.push(s.coin1 + s.coin2 + b.positionSide())
          )
        );
        first = false
      }


      await Promise.all(outdatedBots.filter((b) => !b.avoidCancel).map((b) => cancelOrders(b)));

      await Sockets.getInstance().timeout(1000)

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
          case "5":
            return new DirectionTrader(b, futuresExchangeInfo).place()
          case "6":
            return new Periodically(b, exchangeInfo).place()
          case "7":
            return new SignalingPlacer(b, futuresExchangeInfo).place()
          case "8":
            return new OneStep(b, futuresExchangeInfo).place()


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

async function createServer() {


  const apiId = 708720;
  const apiHash = "1e6f98056d5a7f5c6508b1a38478eb54";
  const stringSession = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAUHIwmGyneJ1D1vODLBkJrLEI5uUPZ1W44dIsC/BY4d3vevWJXuaxQSgPZ6qpIqRUNx24dZEqEoS0oXDqDul7lVs2D89H7FYjUQgG/w9gLNP/BZmi5e3w4m3AGRI98o5SmDe8iO0LTIph8DwRfLowvChTksrhLeMUyBTgoriOFTnECbeptxDWhWuspFdHX6wEjKcRw7ce08atTH427f1a53MjZqZnvTPcSX5BZcecoWcHu5HqjVG40xsVzMSJC+I7uYL+CIhOvquH+o956Vb78qhTWQeBz0k8pwj0qLXLMtGPkoocEDLcr/DYEK06syUlb3x+IPsPW5d2q9PTsORJVsA="); // fill this later with the value from session.save()
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({

    phoneNumber: async () => "",
    password: async () => "",
    phoneCode: async () => "",
    onError: (err) => console.log(err),
  });
  await client.addEventHandler((m) => {
    SignaligProcessor.instance.proccessTextSignal(m.message.text)

    // console.log(JSON.stringify(m.message.text))

  }, new NewMessage({}));
}
