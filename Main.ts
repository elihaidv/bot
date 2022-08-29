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


let exchangeInfo, futuresExchangeInfo

let bots = new Array<Bot>()



async function run() {

  Binance().exchangeInfo().then(data => exchangeInfo = data)
  Binance().futuresExchangeInfo().then(data => futuresExchangeInfo = data)

  await DAL.instance.init(null)
  execute()

}
run()

async function execute() {
  try {
    let botsResults = await DAL.instance.getBots()
    
    let keys: Array<Key> = await DAL.instance.getKeys()

    initBots(botsResults)

    Sockets.getInstance().updateSockets(Array.from(bots.filter(b => !b.isFuture)), keys)
    SocketsFutures.getFInstance().updateSockets(Array.from(bots.filter(b => b.isFuture)), keys)

    let outdatedBots: Array<Bot> = filterOutdated(bots)

    if (exchangeInfo && futuresExchangeInfo) {

      await Promise.all(outdatedBots.map(cancelOrders));
      
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

