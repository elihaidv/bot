import { ObjectId } from "mongodb";
import { DAL } from "../DAL";
import { average, Bot, Signaling } from "../Models";
import { BasePlacer } from "./BasePlacer";
import { FutureTrader } from "./FuturesTrader";
const cancelOrders = require('../CancelOrders');

const SIGNALING_REGEXES = [
  '⚡️⚡️ #(.*)\/(.*) ⚡️⚡️\nExchanges: Binance (.*)\nSignal Type: Regular \\((.*)\\)\nLeverage: Cross \\((.*)X\\)\n+Deposit only (.*)\%\n\nEntry Targets:\n((?:\\d\\).*\n)+)\nTake-Profit Targets:\n((?:\\d\\).*\n)+)\nStop Targets:\n((?:\\d\\).*\n)+)',
  '📦#(.*)\/(.*)-(.*)🔦(.*)IDEA(.*)🪤Maxleveragerecommended:(.*)✓ENTRY:-(.*)-(.*)💵Target1:(.*)💵Target2:(.*)💵Target3:(.*)💵Target4:(.*)💵Target5:(.*)💵Target6:(.*)🪄Stop\\|Loss:(.*)'
]

export class GroupCode {
  static EDITING_GROUP = -1001596116968
  static MIDDLEWARE_GROUP = -1001548647054
  static SPOT_GROUP = -1001799305610
}

export class SignaligProcessor {
  static instance = new SignaligProcessor()
  bots = new Array<Bot>()
  futuresExchangeInfo: any

  proccessTextSignal(message: String) {
    for (let regex of SIGNALING_REGEXES) {
      const match = message.replace(/\s/g, '').match(regex)
      if (match) {
        const s = new Signaling()
        s._id = new ObjectId();
        let lev, enter1, enter2;

        [, s.coin1, s.coin2, , s.direction, , lev, enter1, enter2] = match
        s.enter = [parseFloat(enter1), parseFloat(enter2)]
        s.takeProfits = match.slice(9, 15).map(x => parseFloat(x))
        s.stop = parseFloat(match[15])
        s.lervrage = parseInt(lev)
        s.direction = s.direction == "Bullish" ? "LONG" : "SHORT"
        console.log(s)
        this.placeOrders(s)
      }
    }
  }

  async placeOrders(signaling: Signaling) {

    for (let bot of this.bots) {
      await DAL.instance.addSignaling(bot, signaling)
      bot.binance?.orders.changed.push(signaling.coin1 + signaling.coin2 + bot.positionSide()) 
    }
  }

  setBots(bots: Array<Bot>) {
    this.bots = bots
  }
}

export class SignalingPlacer extends FutureTrader {
  allExchangeInfo: any
  constructor(bot: Bot, e) {
    bot.coin1 = "BTC"
    bot.coin2 = "USDT"
    super(bot, e)
    this.allExchangeInfo = e
  }

  async place() {
    for (let signaling of this.bot.signalings ?? []) {
      this.PAIR = signaling.coin1 + signaling.coin2
      if (!this.futureSockets.prices[this.PAIR])continue
      if (!this.bot.binance!.orders.changed.includes(this.PAIR + this.bot.positionSide())) continue

      this.bot.binance!.orders.changed = this.bot.binance!.orders.changed.filter(x => x != this.PAIR)
      
      this.bot.direction = signaling.direction != "LONG"
      this.orders = this.bot.binance?.orders[this.PAIR] ?? []

      this.exchangeInfo = this.allExchangeInfo.symbols.find(s => s.symbol == this.PAIR)
      this.filters = this.exchangeInfo.filters.reduce((a, b) => { a[b.filterType] = b; return a }, {})
      cancelOrders(this.bot, this.PAIR)
      this.buildHistory()
      this.calculatePrice()
      
      if (new Date().getTime() - signaling.date.getTime() > 1000 * 60 * 60 * 24 * 3) {
        await this.closePosition(signaling)
      } else {
        await this.placeOrder(signaling)
      }
    }

  
  }
  
  async closePosition(signaling: Signaling) {
    DAL.instance.removeSignaling(this.bot, signaling)

    if (this.positionAmount != 0){
      await this.place_order(
        this.PAIR,0,0,
        this.bot.direction,
        {
          stopPrice: this.roundPrice(this.futureSockets.prices[this.PAIR][0] * (this.bot.direction ? 1.001 : 0.999)),
          type: "STOP_MARKET",
          closePosition : true
        })
    }
  }

  async placeOrder(signaling: Signaling) {
    if (!this.myLastOrder?.clientOrderId.includes(signaling._id) ){
      await this.closePosition(signaling)
    } else if(this.myLastOrder?.clientOrderId.includes("LAST")){
      DAL.instance.removeSignaling(this.bot, signaling)
      this.bot.lastOrder = Bot.STABLE
      return
    }

    if(this.isFirst()){

      const price = this.roundPrice(this.minFunc(signaling.enter[0], this.futureSockets.prices[this.PAIR][0]))
      const qu = 11 / price

      this.place_order(
        this.PAIR, qu,price,!this.bot.direction, {
          newClientOrderId: "FIRST" + signaling._id
        })
    } else {

      if (this.myLastOrder?.side == this.buySide()){

        const price = this.roundPrice(signaling.enter[1])
        const qu = 11 / price

        this.place_order(
          this.PAIR, qu,price,!this.bot.direction, {
          })

        this.place_order(
          this.PAIR,0,0,
          this.bot.direction, {
            type: "TAKE_PROFIT_MARKET",
            closePosition: true,
            stopPrice: signaling.takeProfits[0],
            newClientOrderId: "LASTTP" + signaling._id
          })

        this.place_order(
          this.PAIR,0,0,
          this.bot.direction, {
            type: "STOP_MARKET",
            closePosition: true,
            stopPrice: signaling.stop,
            newClientOrderId: "LASTSL" + signaling._id
          })
      }
      
    }
    this.bot.lastOrder = Bot.STABLE
  }
}

