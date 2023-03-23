import { DirectionTrader } from "../Workers/DirectionTrader.js";
import { DualBot } from "../Workers/DualBot.js";
import { FutureTrader } from "../Workers/FuturesTrader.js";
import { Bot, BotStatus, Key, Order } from "../Models.js";
import { WeightAvg } from "../Workers/WeightAvg.js";
import { BasePlacer } from "../Workers/BasePlacer.js";
import { CandleStick, DataManager, MIN_CHART_SIZE, SECONDS_IN_DAY } from "./DataManager.js";
import { FutureDataManager } from "./FutureDataManager.js";
import { env, exit } from "process";
import { DAL } from "../DALSimulation.js";
import { Periodically } from "../Workers/Periodically.js";
import exchangeInfo from './exchangeInfo.js'
import fetch from "node-fetch";
import { OneStep } from "../Workers/OneStep.js";
import { parse } from 'node-html-parser';

import Binance from 'node-binance-api';


import { OrderPlacer } from "../Workers/PlaceOrders.js";
import fetchRetry from "./FetchRetry.js";
import { promises as fs } from "fs";

env.GOOGLE_APPLICATION_CREDENTIALS = "trading-cloud.json"
env.TZ = "UTC"
env.IS_SIMULATION = "true"

let dataManager: DataManager

export async function run(simulationId: string, variation: string | number, startStr: string, endStr: string) {

  const simulation: any = await fetchRetry(`https://itamars.live/api/simulations/${simulationId}?vars=${variation}`, {
    headers: {
      "API-KEY": "WkqrHeuts2mIOJHMcxoK",
      "Accept": "application/json"
    }
  }).then(r => r.json()).catch(console.error)

  const bots: Bot[] = []

  if (typeof variation === "number" || !variation.includes("-")) {
    bots.push(Object.assign(new Bot(), simulation));
  } else {
    const startIndex = parseInt(variation.split("-")[0])
    const endIndex = parseInt(variation.split("-")[1])

    for (let i = startIndex; i <= endIndex; i++) {
      bots.push(Object.assign(new Bot(), simulation));
      Object.assign(bots[i - startIndex], simulation.variations[i]);
      bots[i - startIndex].variation = i
    }
  }


  dataManager = bots[0].isFuture ? new FutureDataManager(bots) : new DataManager(bots);

  dataManager.setExchangeInfo(bots[0].isFuture ?
    exchangeInfo :
    await new Binance({ 'family': 4 }).exchangeInfo())


  dataManager.dal.init(dataManager, simulationId, startStr, endStr)
  const oldest = await fetchOldestHistory(dataManager.PAIR)

  const maxLongSMA = Math.max(...bots.map(b => b.longSMA))
  let start = new Date(startStr).getTime() - (maxLongSMA * 15 * 60 * 1000)
  start = Math.max(start, new Date(oldest).getTime())
  const end = Math.min(new Date(endStr).getTime(), new Date().getTime())
  let endChunk = Math.max(Math.min(end, start + MIN_CHART_SIZE * 1000), start + maxLongSMA * 15 * 60 * 1000)

  dataManager.minHistoryCandles = maxLongSMA
  await dataManager.fetchAllCharts(start, endChunk)
  dataManager.currentCandle = (maxLongSMA * 15 * 60) + (start / 1000) % SECONDS_IN_DAY

  dataManager.initData()

  await place(bots)

  let t = dataManager.chart[dataManager.currentCandle]

  while (t && t.time <= end) {

    let botsToPlace: Bot[] = [];


    let ordersToFill = dataManager.checkOrder(dataManager.openOrders)

    t = dataManager.chart[dataManager.currentCandle]
    if (!t) {
      let startChunk = dataManager.chart.at(-1)!.time + 1000
      let endChunk = Math.min(end, startChunk + MIN_CHART_SIZE * 1000)
      if (endChunk <= startChunk) {
        break;
      }
      await dataManager.fetchAllCharts(startChunk, endChunk)
      dataManager.currentCandle = 0
      t = dataManager.chart[dataManager.currentCandle]
      if (!t) {
        break;
      }
    }

    dataManager.hasMoney(t)

    botsToPlace = bots.filter(b => {
      if (b.lequided) {
        b.lequided = false
        ordersToFill = ordersToFill.filter(o => o.bot != b)
        return true
      }
    })


    if (ordersToFill.length) {
      ordersToFill.forEach(o => {
        console.log(`Execute ${o.side}: ${t.high} ~ ${t.low}`, new Date(parseFloat(t.time)))
        dataManager.orderexecute(o, t)
        if (!botsToPlace.includes(o.bot!)) {
          botsToPlace.push(o.bot!)
        }
      });

    } else if (dataManager.openOrders.length) {
      for (let o of dataManager.openOrders) {

        if ((t.time - o.time) * 1000 >= o.bot!.secound &&
          o.bot!.status != BotStatus.STABLE) {
          botsToPlace.push(o.bot!)
        }
      }
    }

    if (dataManager.dal.awaiter) {
      console.log("awaiter")
      dataManager.dal.awaiter = false
      await timeout(100)
    }

    await place(botsToPlace)
    dataManager.currentCandle++;
  }

  dataManager.currentCandle--
  if (!dataManager.chart[dataManager.currentCandle]) {
    dataManager.currentCandle = dataManager.chart.length - 1
  }
  bots.forEach((b) => dataManager.closePosition(b));
  bots.forEach(b => console.log("Profit: " + b.profitNum + " Variant: " + b.variation))
  // console.log("Profit: " + dataManager.profit)
  await bots.map(b => dataManager.dal.endTest(b))


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

async function place(bots: Bot[]) {
  dataManager.simulateState(bots)
  // trailing = null;

  for (const bot of bots) {
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
    worker.getAction = dataManager.openOrder(bot)
    await worker.place();
  }
}
function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const fetchOldestHistory = async (symbol) => {
  try {
    const oldest = await fs.readFile(`spot/${symbol}/oldest`)
    return oldest.toString()
  } catch (e) {
    const response = await fetch(`https://s3-ap-northeast-1.amazonaws.com/data.binance.vision?delimiter=/&prefix=data/spot/daily/klines/${symbol}/1s/`).then(res => res.text());

    const root = parse(response);

    const arr = root.childNodes[1].childNodes

    const oldest = arr[7].childNodes[0].textContent.split("-1s-")[1].split(".")[0]

    fs.writeFile(`spot/${symbol}/oldest`, oldest)
    return oldest
  }

};