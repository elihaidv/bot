import { DirectionTrader } from "../Workers/DirectionTrader";
import { DualBot } from "../Workers/DualBot";
import { FutureTrader } from "../Workers/FuturesTrader";
import { Bot, Key, Order } from "../Models";
import { WeightAvg } from "../Workers/WeightAvg";
import { BasePlacer } from "../Workers/BasePlacer";
import { CandleStick, DataManager } from "./DataManager";
import { FutureDataManager } from "./FutureDataManager";
import { exit } from "process";
import { DAL } from "../DALSimulation";
import { Periodically } from "../Workers/Periodically";
import fetch from 'node-fetch';


const Binance = require('node-binance-api');

const { MongoClient, ObjectID } = require("mongodb");



const id = process.argv[2] || "61da8b2036520f0737301999";

let dataManager: DataManager
async function run() {

  const simulation = await fetch("https://itamars.live/api/simulations/" + id, {
    headers: {
      "API-KEY": "WkqrHeuts2mIOJHMcxoK"
    }
  }).then(r => r.json())

  const bot: Bot = Object.assign(new Bot(), simulation);



  dataManager = bot.isFuture ? new FutureDataManager(bot) : new DataManager(bot);

  dataManager.setExchangeInfo(bot.isFuture ?
    await Binance().futuresExchangeInfo() :
    await Binance().exchangeInfo())

  await dataManager.fetchChart()

  dataManager.initData()

  DAL.instance.init(dataManager,id)
  await place(bot)

  const executeds = new Map<Number, Order>()



  for (let i = dataManager.time; i < dataManager.chart.length - 1; i++) {
    const t = dataManager.chart[i]

    // const low = Math.min(t.low,  dataManager.chart[i - 1]?.low ?? Infinity)
    let ToPlace = false;

    for (let o of dataManager.openOrders.slice().reverse()) {

      // if (await checkTrailing(bot,o,t)) break;

      //     case "TRAILING_STOP_MARKET": 
      //     if (!trailing) {
      //       trailing = t.high
      //       // console.log(`Trailing activate ${o.side}: ${o.price}`)
      //     }
      if (("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "BUY" || o.type == "STOP_MARKET" && o.side == "SELL") && o.price > t.low ||
        ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "SELL" || o.type == "STOP_MARKET" && o.side == "BUY") && o.price < t.high) {

        console.log(`Execute ${o.side}: ${t.high} ~ ${t.low}`, new Date(parseFloat(t.time)))
        executeds[dataManager.time] = o
        dataManager.orderexecute(o, t)
        ToPlace = true
        // // break;
        // dataManager.time += 60
        // i += 60
      } else if (dataManager.time - o.time >= bot.secound / 60 && bot.lastOrder != Bot.STABLE) {
        // console.log("expire")
        ToPlace = true
        break;

      }
    }

    if (DAL.instance.awaiter){
      console.log("awaiter")
      DAL.instance.awaiter = false
      await timeout(100)
    }

    ToPlace && await place(bot)
    if (!dataManager.hasMoney(t) && t.close) {
      console.log("😰Liquid at: " + t.close)
      DAL.instance.logStep({ "type": "😰Liquid", low: t.close, priority: 10 })
      break;
    }
    dataManager.time++
  }
  dataManager.closePosition(dataManager.chart[dataManager.time - 1].low);
  console.log("Profit: " + dataManager.profit)
  await DAL.instance.endTest()
 
  exit(0)
}

// async function checkTrailing(bot: Bot, o: Order, t: CandleStick) {

//   if (trailing && o.type == "TRAILING_STOP_MARKET") {
//     const direction = bot.direction;
//     trailing = direction ? Math.min(t.low, trailing) : Math.max(t.high, trailing)
//     console.log(`Trailing Update: ${trailing}`)

//     if ((direction ? -1 : 1) * (trailing - t.close) / trailing > bot.callbackRate / 100) {
//       console.log(`Execute Trailing ${o.side}: ${t.high} ~ ${t.low}`)
//       o.price = t.close
//       dataManager.orderexecute(o)
//       await place(bot)
//       return true
//     }
//   }
//   return false
// }

async function place(bot: Bot) {
  dataManager.simulateState()
  // trailing = null;

  let worker: BasePlacer
  switch (bot.bot_type_id.toString()) {
    // case "1":
    //   return new OrderPlacer(b, exchangeInfo).place();
    case "2":
      worker = new WeightAvg(bot, dataManager.exchangeInfo)
      break
    case "3":
      worker = new FutureTrader(bot, dataManager.exchangeInfo)
      break
    case "4":
      worker = new DualBot(bot, dataManager.exchangeInfo)
      break
    case "5":
      worker = new DirectionTrader(bot, dataManager.exchangeInfo)
      break
    case "6":
    default:
      worker = new Periodically(bot, dataManager.exchangeInfo)
      break

  }

  worker.getAction = dataManager.openOrder
  await worker.place();
}
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
run()