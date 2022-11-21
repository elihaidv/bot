import { DirectionTrader } from "../Workers/DirectionTrader";
import { DualBot } from "../Workers/DualBot";
import { FutureTrader } from "../Workers/FuturesTrader";
import { Bot, BotStatus, Key, Order } from "../Models";
import { WeightAvg } from "../Workers/WeightAvg";
import { BasePlacer } from "../Workers/BasePlacer";
import { CandleStick, DataManager } from "./DataManager";
import { FutureDataManager } from "./FutureDataManager";
import { exit } from "process";
import { DAL } from "../DALSimulation";
import { Periodically } from "../Workers/Periodically";
import fetch from 'node-fetch';
import { OneStep } from "../Workers/OneStep";


const Binance = require('node-binance-api');
import { OrderPlacer } from "../Workers/PlaceOrders";




console.log(process.argv)
const id = process.argv[3] || "61da8b2036520f0737301999";

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
    await Binance({ 'family': 4 }).futuresExchangeInfo() :
    await Binance({ 'family': 4 }).exchangeInfo())


  DAL.instance.init(dataManager, id)

  const start = new Date(process.argv[4]).getTime() - (500 * 15 * 60 * 1000)
  const end = new Date(process.argv[5]).getTime()
  let endChunk = Math.min(end, start + dataManager.MIN_CHART_SIZE * 1000)

  await dataManager.fetchAllCharts(start, endChunk)
  dataManager.currentCandle = (500 * 15 * 60)
  dataManager.currentHour = 125

  dataManager.initData()
  await place(bot)

  let t = dataManager.chart[dataManager.currentCandle]

  while (t && t.time <= end) {

    let ToPlace = false;

    const ordersToFill = dataManager.checkOrder(dataManager.openOrders)

    t = dataManager.chart[dataManager.currentCandle]
    if (!t) {
      let startChunk = dataManager.chart.at(-1)!.time + 1000
      let endChunk = Math.min(end, startChunk + dataManager.MIN_CHART_SIZE * 1000)
      await dataManager.fetchAllCharts(startChunk, endChunk)
      dataManager.currentCandle = dataManager.MIN_CHART_SIZE
      t = dataManager.chart[dataManager.currentCandle]
    }

    if (ordersToFill.length) {
      const o = ordersToFill[0]
      console.log(`Execute ${o.side}: ${t.high} ~ ${t.low}`, new Date(parseFloat(t.time)))
      dataManager.orderexecute(o, t)
      ToPlace = true

    } else if ( dataManager.openOrders.length &&
                dataManager.currentCandle - dataManager.openOrders[0].time >= bot.secound &&
                bot.status != BotStatus.STABLE) {
      ToPlace = true
    }

    if (DAL.instance.awaiter) {
      console.log("awaiter")
      DAL.instance.awaiter = false
      await timeout(100)
    }


    if (!dataManager.hasMoney(t) && t.close) {
      console.log("😰Liquid at: " + t.close)
      DAL.instance.logStep({ "type": "😰Liquid", low: t.close, priority: 10 })
      break;
    }    

    ToPlace && await place(bot)
    dataManager.currentCandle++;
  }

  dataManager.currentCandle--
  dataManager.closePosition(dataManager.chart[dataManager.currentCandle].low);
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
    case "1":
      worker = new OrderPlacer(bot, dataManager.exchangeInfo);
      break
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
      worker = new Periodically(bot, dataManager.exchangeInfo)
      break
    case "7":
    default: {

      worker = new OneStep(bot, dataManager.exchangeInfo);

      // (worker as OneStep).cancelOrders = async () => {dataManager.openOrders = []}
      break

    }
  }
  worker.getAction = dataManager.openOrder
  await worker.place();
}
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
run()