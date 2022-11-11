import { ObjectId } from "mongodb";
import { DAL } from "../DAL";
import { average, Bot, Signaling, SignalingType } from "../Models";
import { BasePlacer } from "./BasePlacer";
import { FutureTrader } from "./FuturesTrader";
const cancelOrders = require('../CancelOrders');

const SIGNALING_TYPES = [
  // new SignalingType('⚡️⚡️ #(.*)\/(.*) ⚡️⚡️\nExchanges: Binance (.*)\nSignal Type: Regular \\((.*)\\)\nLeverage: Cross \\((.*)X\\)\n+Deposit only (.*)\%\n\nEntry Targets:\n((?:\\d\\).*\n)+)\nTake-Profit Targets:\n((?:\\d\\).*\n)+)\nStop Targets:\n((?:\\d\\).*\n)+)', new Map([]),
  new SignalingType('📦#(.*)\/(.*)-(.*)🔦(.*)IDEA(.*)🪤Maxleveragerecommended:(.*)✓ENTRY:-?(.*)-(.*)💵Target1:(.*)💵Target2:(.*)💵Target3:(.*)💵Target4:(.*)💵Target5:(.*)💵Target6:(.*)🪄Stop\\|Loss:(.*)', 1, 2, 4, 6, 7, 8, 9, 14, 15, "Bullish"),
  new SignalingType(`📈(.*)Signal#(.*)30m\\|(.*)Entryprice:(.*)-(.*)-⏳-Signaldetails:Target:(.*)Target:(.*)Target:(.*)Target:(.*)❌Stop-Loss:(.*)🧲Leverage:(.*)\\[(.*)\\]@USABitcoinArmy`, 2, 2, 1, 11, 4, 5, 6, 9, 10, "Long"),

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
    for (let type of SIGNALING_TYPES) {
      const match = message?.replace(/\s/g, '').match(type.regex)
      if (match) {
        const s = new Signaling()
        s._id = new ObjectId();
        s.coin1 = match[type.coin1]
        s.coin2 = type.coin1 == type.coin2 ? "" : match[type.coin2]
        s.lervrage = match[type.leverage]
        s.enter = match.slice(type.enterPriceStart, type.enterPriceEnd + 1).map(e => Number(e))
        s.takeProfits = match.slice(type.takeProfitStart, type.takeProfitEnd + 1).map(e => Number(e))
        s.stop = Number(match[type.stopPrice])
        s.direction = match[type.direction] == type.longTerm ? "LONG" : "SHORT"

        console.log(s)
        this.placeOrders(s)
      }
    }
  }

  async placeOrders(signaling: Signaling) {

    for (let bot of this.bots) {
      if (!bot.signalings.map(s => s.coin1 + s.coin2).includes(signaling.coin1 + signaling.coin2)){
        await DAL.instance.addSignaling(bot, signaling)
        bot.binance?.orders.changed.push(signaling.coin1 + signaling.coin2 + bot.positionSide())
      }
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
      if (!this.futureSockets.prices[this.PAIR]) continue
      if (!this.bot.binance!.orders.changed.includes(this.PAIR + this.bot.positionSide())) continue

      this.bot.binance!.orders.changed = this.bot.binance!.orders.changed.filter(x => x != this.PAIR + this.bot.positionSide())

      this.bot.direction = signaling.direction != "LONG"
      this.orders = this.bot.binance?.orders[this.PAIR] ?? []

      this.exchangeInfo = this.allExchangeInfo.symbols.find(s => s.symbol == this.PAIR)
      this.filters = this.exchangeInfo.filters.reduce((a, b) => { a[b.filterType] = b; return a }, {})
      await cancelOrders(this.bot, this.PAIR)
      this.buildHistory()
      this.calculatePrice()

      if (new Date().getTime() - signaling.date.getTime() > 1000 * 60 * 60 * 24 * 3) {
        await this.closePosition(signaling._id)
      } else {
        await this.placeOrder(signaling)
      }
    }


  }

  async closePosition(signalingId: String) {
    DAL.instance.removeSignaling(this.bot, signalingId)

    if (this.positionAmount != 0) {
      await this.place_order(
        this.PAIR, 0, 0,
        this.bot.direction,
        {
          stopPrice: this.roundPrice(this.futureSockets.prices[this.PAIR][0] * (this.bot.direction ? 1.001 : 0.999)),
          type: "STOP_MARKET",
          closePosition: true
        })
    }
  }

  async placeOrder(signaling: Signaling) {
    this.error = false

    if (this.myLastOrder && !this.myLastOrder?.clientOrderId.includes(signaling._id)) {
      await this.closePosition(this.myLastOrder.clientOrderId.split("_")[1])
    } else if (this.myLastOrder?.clientOrderId.includes("LAST")) {
      DAL.instance.removeSignaling(this.bot, signaling._id)
      this.bot.lastOrder = Bot.STABLE
      return
    }
    
    const minAmount = parseFloat(this.filters.MIN_NOTIONAL.notional)
    let stoploose = signaling.stop

    if (this.isFirst()) {

      const price = this.roundPrice(this.minFunc(signaling.enter[0], this.futureSockets.prices[this.PAIR][0]))
      const qu = 11 / price

      await this.place_order(
        this.PAIR, qu, price, !this.bot.direction, {
        newClientOrderId: "FIRST_" + signaling._id
      })
    } else {
      let exitNum = 0

      if (this.myLastOrder?.side == this.buySide()) {
        const match = this.myLastOrder!.clientOrderId.match(/ENTER(\d)/)
        const enterNum = parseInt(match?.length ? match[1] : "1")


        if (enterNum < 4) {

          const step = (signaling.enter[0] - signaling.enter[1]) / 4
          const price = this.roundPrice(signaling.enter[0] - step * enterNum)
          const qu = 11 / price

          await this.place_order(
            this.PAIR, qu, price, !this.bot.direction, {
            newClientOrderId: `ENTER${enterNum + 1}_${signaling._id}`
          })
        }

        const sellPrice = signaling.takeProfits[0]
        const sellQu = this.positionAmount / 3 

        await this.place_order(
          this.PAIR, sellQu, sellPrice, this.bot.direction, {
          newClientOrderId: `EXIT1_${signaling._id}`,
          reduceOnly: true
        })

      } else if (this.myLastOrder?.side == this.sellSide()) {

        const match = this.myLastOrder!.clientOrderId.match(/EXIT(\d)/)
        exitNum = parseInt(match?.length ? match[1] : "1")
        stoploose = signaling.enter[0]

        if (exitNum < 6) {

          const price = signaling.takeProfits[exitNum]
          const qu = this.positionAmount / 3

          await this.place_order(
            this.PAIR, qu, price, this.bot.direction, {
            newClientOrderId: `EXIT${exitNum + 1}_${signaling._id}`,
            reduceOnly: true
          })
        }
      }


      await this.place_order(
        this.PAIR, 0, 0,
        this.bot.direction, {
        type: "TAKE_PROFIT_MARKET",
        closePosition: true,
        stopPrice: signaling.takeProfits[exitNum + 1],
        newClientOrderId: "LASTTP_" + signaling._id
      })

      await this.place_order(
        this.PAIR, 0, 0,
        this.bot.direction, {
        type: "STOP_MARKET",
        closePosition: true,
        stopPrice: stoploose,
        newClientOrderId: "LASTSL_" + signaling._id
      })
    }
    if (this.error) {
      this.bot.binance!.orders.changed.push(this.PAIR + this.bot.positionSide())
    }
    this.bot.lastOrder = Bot.STABLE
  }
}

