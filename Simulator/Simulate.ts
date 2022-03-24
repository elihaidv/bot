import { DirectionTrader } from "../Workers/DirectionTrader";
import { DualBot } from "../Workers/DualBot";
import { FutureTrader } from "../Workers/FuturesTrader";
import { Bot, Key, Order } from "../Models";
import { WeightAvg } from "../Workers/WeightAvg";
import { BasePlacer } from "../Workers/BasePlacer";
import { CandleStick, DataManager } from "./DataManager";
import { FutureDataManager } from "./FutureDataManager";
import { exit } from "process";

const Binance = require('node-binance-api');

const { MongoClient, ObjectID } = require("mongodb");

const DB = require('../DB')


const uri = DB.USERNAME ?
  `mongodb://${DB.USERNAME}:${DB.PASSWORD}@${DB.ADDRESS}?writeConcern=majority` :
  `mongodb://127.0.0.1:27017/trading_bot?writeConcern=majority`;
const id = process.argv[2] || "61da8b2036520f0737301999";


let trailing;
let exchangeInfo, dataManager: DataManager
async function run() {
  const db = await MongoClient.connect(uri)
  const dbo = db.db("trading_bot")
  const bots = await dbo.collection('bot').find({ _id: ObjectID(id) }).toArray()
  let keys: Array<Key> = await dbo.collection('key').find({}).toArray()
  let t

  const bot: Bot = Object.assign(new Bot(), bots[0]);

  exchangeInfo = bot.isFuture ? 
    await Binance().futuresExchangeInfo() :
    await Binance().exchangeInfo()

  dataManager = bot.isFuture ? new FutureDataManager(bot) : new DataManager(bot);

  await dataManager.fetchChart()

  dataManager.initData()

  await place(bot)

  const executeds = new Map<Number, Order>()

  for (t of dataManager.chart.slice(dataManager.time)) {
    if (!dataManager.hasMoney(t) && t.close) {
      console.log("😰Liquid at: " + t.close)
      break;
    }
    for (let o of dataManager.openOrders) {
      if (await checkTrailing(bot,o,t)) break;

      if (t.high > o.price && o.price > t.low) {
        if (o.type == "TRAILING_STOP_MARKET") {
          if (!trailing) {
            trailing = t.high
            // console.log(`Trailing activate ${o.side}: ${o.price}`)
          }

        } else {
          console.log(`Execute ${o.side}: ${t.high} ~ ${t.low}`)
          executeds[dataManager.time] = o
          dataManager.orderexecute(o)
          await place(bot)
          break;
        }
      } else if (dataManager.time - o.time >= bot.secound / 60 && bot.lastOrder != Bot.STABLE) {
        // console.log("expire")
        await place(bot)
        break;

      }
    }
    dataManager.time++
  }
  dataManager.closePosition(dataManager.chart.at(-1)?.low);
  console.log("Profit: " + dataManager.profit)
  // console.log(JSON.stringify(executeds))
  // console.log(JSON.stringify(dataManager.chart.map(c=>(["", parseFloat(c.high),parseFloat(c.close),parseFloat(c.close),parseFloat(c.low)]))))
  exit(0)
}

async function checkTrailing(bot:Bot, o:Order, t:CandleStick){
  const direction = bot.direction;

  if (trailing && o.type == "TRAILING_STOP_MARKET") {
    trailing = direction ? Math.min(t.low, trailing) : Math.max(t.high, trailing)
    console.log(`Trailing Update: ${trailing}`)

    if ((direction ? -1 : 1) * (trailing - t.close) / trailing > bot.callbackRate / 100) {
      console.log(`Execute Trailing ${o.side}: ${t.high} ~ ${t.low}`)
      o.price = t.close
      dataManager.orderexecute(o)
      await place(bot)
      return true
    }
  }
  return false
}

async function place(bot: Bot) {
  dataManager.simulateState()
  trailing = null;

  let worker: BasePlacer
  switch (bot.bot_type_id.toString()) {
    // case "1":
    //   return new OrderPlacer(b, exchangeInfo).place();
    case "2":
      worker = new WeightAvg(bot, exchangeInfo)
      break
    case "3":
      worker = new FutureTrader(bot, exchangeInfo)
      break
    case "4":
      worker = new DualBot(bot, exchangeInfo)
      break
    default:
      worker = new DirectionTrader(bot, exchangeInfo)
      break

  }

  worker.getAction = dataManager.openOrder
  await worker.place();
}
run()