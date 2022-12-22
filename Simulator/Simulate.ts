import { DirectionTrader } from "../Workers/DirectionTrader";
import { DualBot } from "../Workers/DualBot";
import { FutureTrader } from "../Workers/FuturesTrader";
import { Bot, BotStatus, Key, Order } from "../Models";
import { WeightAvg } from "../Workers/WeightAvg";
import { BasePlacer } from "../Workers/BasePlacer";
import { CandleStick, DataManager } from "./DataManager";
import { FutureDataManager } from "./FutureDataManager";
import { env, exit } from "process";
import { DAL } from "../DALSimulation";
import { Periodically } from "../Workers/Periodically";
import exchangeInfo from './exchangeInfo.json'

const fetch = require('node-fetch');
import { OneStep } from "../Workers/OneStep";


const Binance = require('node-binance-api');
import { OrderPlacer } from "../Workers/PlaceOrders";

env.GOOGLE_APPLICATION_CREDENTIALS = "trading-cloud.json"
env.TZ="UTC"
env.IS_SIMULATION = "true"

let dataManager: DataManager
export async function run(simulationId: string, variation:number, startStr: string, endStr: string) {

  const simulation = await fetch("https://itamars.live/api/simulations/" + simulationId + "?var=" + variation, {
    headers: {
      "API-KEY": "WkqrHeuts2mIOJHMcxoK"
    }
  }).then(r => r.json()).catch(console.error)

  const bot: Bot = Object.assign(new Bot(), simulation);

  if (simulation.variations) {
    Object.assign(bot, simulation.variations[variation]);
  }



  dataManager = bot.isFuture ? new FutureDataManager(bot) : new DataManager(bot);

  dataManager.setExchangeInfo(bot.isFuture ?
    exchangeInfo :
    await Binance({ 'family': 4 }).exchangeInfo())


  dataManager.dal.init(dataManager, simulationId, variation, startStr, endStr)

  const start = new Date(startStr).getTime() - (bot.longSMA * 15 * 60 * 1000)
  const end = new Date(endStr).getTime()
  let endChunk = Math.min(end, start + dataManager.MIN_CHART_SIZE * 1000)

  await dataManager.fetchAllCharts(start, endChunk)
  dataManager.currentCandle = (bot.longSMA * 15 * 60)

  dataManager.initData()
  await place(bot)

  let t = dataManager.chart[dataManager.currentCandle]

  while (t && t.time <= end) {

    let ToPlace = false;

    const ordersToFill = dataManager.checkOrder(dataManager.openOrders, bot.status != BotStatus.STABLE ? bot.secound : 0)

    t = dataManager.chart[dataManager.currentCandle]
    if (!t) {
      let startChunk = dataManager.chart.at(-1)!.time + 1000
      let endChunk = Math.min(end, startChunk + dataManager.MIN_CHART_SIZE * 1000)
      if (endChunk <= startChunk) {
        break;
      }
      await dataManager.fetchAllCharts(startChunk, endChunk)
      dataManager.currentCandle = dataManager.MIN_CHART_SIZE
      t = dataManager.chart[dataManager.currentCandle]
      if (!t) {
        break;
      }
    }

    if (ordersToFill.length) {
      const o = ordersToFill[0]
      console.log(`Execute ${o.side}: ${t.high} ~ ${t.low}`, new Date(parseFloat(t.time)))
      dataManager.orderexecute(o, t)
      ToPlace = true

    } else if (dataManager.openOrders.length &&
      (t.time - dataManager.openOrders[0].time) * 1000 >= bot.secound &&
      bot.status != BotStatus.STABLE) {
      ToPlace = true
    }

    if (dataManager.dal.awaiter) {
      console.log("awaiter")
      dataManager.dal.awaiter = false
      await timeout(100)
    }


    if (!dataManager.hasMoney(t) && t.close) {
      console.log("😰Liquid at: " + t.close)
      dataManager.dal.logStep({ "type": "😰Liquid", low: t.close, priority: 10 })
      break;
    }

    ToPlace && await place(bot)
    dataManager.currentCandle++;
  }

  dataManager.currentCandle--
  if (!dataManager.chart[dataManager.currentCandle]) {
    dataManager.currentCandle = dataManager.chart.length - 1
  }
  dataManager.closePosition();
  console.log("Profit: " + dataManager.profit)
  await dataManager.dal.endTest()

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