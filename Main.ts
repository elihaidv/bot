
import Binance from 'node-binance-api';
import dotenv from 'dotenv'
dotenv.config({ path: '../.env' });
import cancelOrders from './CancelOrders.js';
import { DirectionTrader } from './Workers/DirectionTrader.js';
import { DualBot } from './Workers/DualBot.js';
import { FutureTrader } from './Workers/FuturesTrader.js';
import { Bot, BotStatus, Key } from './Models.js'
// import { OrderPlacer } from './PlaceOrders.js';
import { Sockets } from './Sockets/Sockets.js';
import { SocketsFutures } from './Sockets/SocketsFuture.js';
import { WeightAvg } from './Workers/WeightAvg.js';
import { DAL } from './DAL.js';
import { Periodically } from './Workers/Periodically.js';
import { SignaligProcessor, SignalingPlacer } from './Workers/SignaligProcessor.js';
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { NewMessage } from "telegram/events/index.js";
import { OneStep } from './Workers/OneStep.js';
import { OrderPlacer } from './Workers/PlaceOrders.js';
import { BotLogger } from './Logger.js';
import { Severity } from 'coralogix-logger';
import { AviAlgo } from './Workers/AviAlgo.js';


let exchangeInfo, futuresExchangeInfo, first = true

let bots = new Array<Bot>();



async function run() {
  try {
    console.log("Starting trading bot system...")
    
    // Initialize Binance APIs with error handling
    new Binance({
      family: 4  // Force IPv4 to resolve DNS family error
    }).exchangeInfo().then(data => {
      exchangeInfo = data
      console.log("exchangeInfo loaded")
    }).catch(err => {
      console.error("Failed to load exchangeInfo:", err.message)
    })
    
    new Binance({
      family: 4  // Force IPv4 to resolve DNS family error
    }).futuresExchangeInfo().then(data => {
      futuresExchangeInfo = data
      SignaligProcessor.instance.futuresExchangeInfo = data
      console.log("futuresExchangeInfo loaded")
    }).catch(err => {
      console.error("Failed to load futuresExchangeInfo:", err.message)
    })

    // Initialize database with error handling
    await DAL.instance.init()
    console.log("Database connection initialized")
    
    setInterval(execute, 3000)
    console.log("Trading bot system started successfully")

    // createServer()
  } catch (error) {
    console.error("Failed to start trading bot system:", error.message)
    BotLogger.instance.error({
      type: "StartupError",
      message: error?.message || error,
    })
  }
}
run()



async function execute() {

  try {
    // Check if database is initialized
    if (!DAL.instance.dbo) {
      console.warn("Database not initialized yet, skipping execution cycle")
      return
    }

    let botsResults = await DAL.instance.getBots()

    let keys: Array<Key> = await DAL.instance.getKeys()

    initBots(botsResults)

    Sockets.getInstance().updateSockets(Array.from(bots.filter(b => !b.isFuture)), keys)
    SocketsFutures.getFInstance().updateSockets(Array.from(bots.filter(b => b.isFuture)), keys)

    SignaligProcessor.instance.setBots(Array.from(bots.filter(b => b.bot_type_id == "7")))

    let outdatedBots: Array<Bot> = filterOutdated(bots)

    // Check if exchange info is loaded before attempting to place orders
    if (exchangeInfo && futuresExchangeInfo) {

      if (first) {
        console.log("Initializing placers for the first time...")
        initPlacer(bots)
        first = false
        console.log("Placers initialized successfully")
      }

      console.log(`Processing ${outdatedBots.length} outdated bots`)

      await Promise.all(outdatedBots.filter((b) => !b.avoidCancel).map((b) => cancelOrders(b)));

      await Sockets.getInstance().timeout(1000)

      // Execute place orders with individual error handling
      const placePromises = outdatedBots.map((b) => {
        if (b.placer) {
          return b.placer.place().catch(error => {
            console.error(`Failed to place order for bot ${b.id()}:`, error.message)
            BotLogger.instance.error({
              type: "PlaceOrderExecutionError",
              bot_id: b._id,
              message: error?.message || error,
            })
          })
        }
        return Promise.resolve()
      })
      
      await Promise.all(placePromises)
    } else {
      if (!exchangeInfo) {
        console.warn("Exchange info not loaded yet, skipping order placement")
      }
      if (!futuresExchangeInfo) {
        console.warn("Futures exchange info not loaded yet, skipping order placement")
      }
    }
  } catch (e: any) {
    console.error("Error in execute function:", e)
    BotLogger.instance.log({
      type: "GeneralError",
      message: e?.message || e,
    }, Severity.error)
  }
}

function initPlacer(bots: Array<Bot>) {
  bots.filter(b => b.bot_type_id == "7").forEach(b =>
    b.signalings.forEach(s =>
      b.binance?.orders.changed.push(s.coin1 + s.coin2 + b.positionSide())
    )
  );

  bots.forEach(b => {
    switch (b.bot_type_id) {
      case "1":
        b.placer = new OrderPlacer(b, exchangeInfo);
        break;
      case "2":
        b.placer = new WeightAvg(b, exchangeInfo);
        break;
      case "3":
        b.placer = new FutureTrader(b, futuresExchangeInfo);
        break;
      case "4":
        b.placer = new DualBot(b, futuresExchangeInfo);
        break;
      case "5":
        b.placer = new DirectionTrader(b, futuresExchangeInfo);
        break;
      case "6":
        b.placer = new Periodically(b, exchangeInfo);
        break;
      case "7":
        b.placer = new SignalingPlacer(b, futuresExchangeInfo);
        break;
      case "8":
        b.placer = new OneStep(b, futuresExchangeInfo);
        break;
      case "9":
        b.placer = new AviAlgo(b, futuresExchangeInfo);
        break;
        
    }

  });
}


function filterOutdated(bots: Array<Bot>): Array<Bot> {
  return bots.filter(b => {

    const PAIR = b.coin1 + b.coin2 + b.positionSide()
    if (b.binance && b.binance!.orders && b.binance!.changed.includes(PAIR)) {
      b.binance!.changed = b.binance!.changed.filter(p => p != PAIR)
      BotLogger.instance.log({ "type": "changed", "bot_id": b.id(), "pair": PAIR })
      b.botStatus = BotStatus.WORK
      return true
    }
    // if (b.signalings && b.binance && b.binance!.orders && b.status != BotStatus.ERROR) {
    //   for (let s of b.signalings) {
    //     if (b.binance!.changed.includes(s.coin1 + s.coin2 + b.positionSide())) {
    //       return true
    //     }
    //   }
    // }
    if (b.botStatus == BotStatus.STABLE) return false
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
