import { DirectionTrader } from "../Workers/DirectionTrader";
import { DualBot } from "../Workers/DualBot";
import { FutureTrader } from "../Workers/FuturesTrader";
import { Bot, Key, Order } from "../Models";
import { WeightAvg } from "../Workers/WeightAvg";
import { BasePlacer } from "../Workers/BasePlacer";
import { CandleStick, DataManager } from "./DataManager";
import { FutureDataManager } from "./FutureDataManager";
import { exit } from "process";
import { DAL } from "../DAL";

const Binance = require('node-binance-api');

const { MongoClient, ObjectID } = require("mongodb");

const DB = require('../DB')


const uri = DB.USERNAME ?
  `mongodb://${DB.USERNAME}:${DB.PASSWORD}@${DB.ADDRESS}?writeConcern=majority` :
  `mongodb://127.0.0.1:27017/trading_bot?writeConcern=majority`;
const id = process.argv[2] || "61da8b2036520f0737301999";


let trailing;
let  dataManager: DataManager
async function run() {
  const db = await MongoClient.connect(uri)
  const dbo = db.db("trading_bot")
  const tests = await dbo.collection('tests').find({ _id: ObjectID(id) }).toArray()
  let bots = []

  if (tests.length == 0) {
    bots = await dbo.collection('bot').find({ _id: ObjectID(id) }).toArray()
  } else {
    bots = await dbo.collection('bot').find({ _id: ObjectID(tests[0].bot_id) }).toArray()
  }
  
  let keys: Array<Key> = await dbo.collection('key').find({}).toArray()
  let t

  const bot: Bot = Object.assign(new Bot(), bots[0]);



    dataManager = bot.isFuture ? new FutureDataManager(bot) : new DataManager(bot);

    dataManager.setExchangeInfo(bot.isFuture ?
        await Binance().futuresExchangeInfo() :
        await Binance().exchangeInfo())

  await a.fetchChart()

  dataManager.initData()

  await DAL.instance.init(dataManager)
  if (tests.length == 0) {
    await DAL.instance.createTest(bot)
  } else {
    await DAL.instance.startTest(tests[0])
  }
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

         

        
        console.log(`Execute ${o.side}: ${t.high} ~ ${t.low}`)
        executeds[dataManager.time] = o
        dataManager.orderexecute(o, t)
       ToPlace = true
        // break;

      } else if (dataManager.time - o.time >= bot.secound / 60 && bot.lastOrder != Bot.STABLE) {
        // console.log("expire")
        ToPlace = true
        break;

      }
    }
    ToPlace &&  await place(bot)
    if (!dataManager.hasMoney(t) && t.close) {
      console.log("😰Liquid at: " + t.close)
      break;
    }
    dataManager.time++
  }
  dataManager.closePosition(dataManager.chart[dataManager.time - 1 ].low);
  console.log("Profit: " + dataManager.profit)
  await DAL.instance.endTest(dataManager.profit)
  // console.log(JSON.stringify(executeds))
  // console.log(JSON.stringify(dataManager.chart.map(c=>(["", parseFloat(c.high),parseFloat(c.close),parseFloat(c.close),parseFloat(c.low)]))))
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
  trailing = null;

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
    default:
      worker = new DirectionTrader(bot, dataManager.exchangeInfo)
      break

  }

  worker.getAction = dataManager.openOrder
  await worker.place();
}
run()