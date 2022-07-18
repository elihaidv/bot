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


let exchangeInfo, futuresExchangeInfo

let bots = new Array<Bot>();


// TO DELETE: for local (like DB)
let dev_keys = new Array<Key>();

// TO DELETE: for local (like DB)
let my_bot = {
    "_id": "62278c6132b9cc5e183dcf47",
    "bot_type_id": "2",
    "name": "פיתוח",
    "key_id": "p3x1d63d9ay5wf0f72e11eg2",
    "coin1": "BUSD",
    "coin2": "USDT",
    "last_distance": "0.02",
    "buy_percent": "0.003",
    "secound": "60",
    "minbnb": null,
    "bnbamount": null,
    "amount_percent": "0.02",
    "take_profit": "0.02",
    "SMA": "3",
    "increase_factor": null,
    "stream": "1",
    "user_id": "ufb29y3d9ab2bf0f72e1fv8s",
    "run": "1",
    "profit": 0.0,
    "stop_loose": "0.15",
    "startBalance": 15.0,
    "closer": null,
    "enviroment": "LOCAL",
    "deleted_at": "0",
    "take_profit_position": "0.02",
    "updated_at": "2022-03-08T21:21:21.391Z",
    "created_at": "2022-03-08T17:03:29.299Z"
};

// TO DELETE: for local (like DB)
let my_key = {
    "_id" : "p3x1d63d9ay5wf0f72e11eg2", 
    "id" : "1", 
    "name" : "avraham", 
    "public" : "vTMdUBOlWBdRDCbZ5a5SCRSv7zvZaFRUE0XpBKdpmho2npiCnjbpdmQfZrBrJxW8",
    "secret" : "CCO5bnNlTuJ5UpJTBT5mkJbCCB1CnlRmniHSwLNn9N7919V2otxX1Vt5j248i4Jk",
    "user_id" : "5be1d63d9ab2bf0f72e180cf", 
    "created_at" : "2018-01-01 21:08:34", 
    "updated_at" : "2018-01-01 21:08:34", 
    "deleted_at" : null, 
    "key_id" : "5be1d63d9ab2bf0f72e180c0", 
    "burse" : "binance" 
};




async function run() {

  await configLogger()

  await DAL.instance.init()
  execute()

}
run()



async function execute() {
  logger.info("execute!");

  try {
    let botsResults = await DAL.instance.getBots()
    
    let keys: Array<Key> = await DAL.instance.getKeys()

    initBots(botsResults)
    
    Sockets.getInstance().updateSockets(Array.from(bots.filter(b => !b.isFuture)), keys)
    // SocketsFutures.getFInstance().updateSockets(Array.from(bots.filter(b => b.isFuture)), keys)

    let outdatedBots: Array<Bot> = filterOutdated(bots)

    if (exchangeInfo && futuresExchangeInfo) {

      await Promise.all(outdatedBots.map(cancelOrders));
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

        }
      }))
    }

  } catch (e) {
    // console.log(e)
    logger.error(e);
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



async function configLogger() {

    try {
        require('fs').mkdirSync('./log');
    } catch (e: any) {
        if (e.code != 'EEXIST') {
            console.error("Could not set up log directory, error was: ", e);
            process.exit(1);
        }
    }
    
    log4js.configure('./log4js.json');
}
