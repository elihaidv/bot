import { Bot, BotStatus, Order } from "../Models.js";
import { SocketsFutures } from "../Sockets/SocketsFuture.js";
import { CandleStick, DataManager } from "./DataManager.js";

export class FutureDataManager extends DataManager {

    constructor(bots: Bot[]) {
        super(bots);
        this.sockets = SocketsFutures.getFInstance()
        this.sockets.averagePrice = this.averagePrice.bind(this)
        this.sockets.averagePriceQuarter = this.averagePriceQuarter.bind(this);
        (this.sockets as SocketsFutures).addRealtimePrices = this.addRealtimePrices.bind(this);
        (this.sockets as SocketsFutures).getRealtimePrices = this.getRealtimePrices.bind(this)
    }


    orderexecute(order: Order, t: CandleStick) {
        const bot = order.bot || this.bots[0]
        bot.botStatus = BotStatus.WORK

        let qu = (order.side == "BUY" ? 1 : -1) * order.executedQty

        let gain = 0

        const pos = bot.binance!.positions[this.PAIR + bot.positionSide()]


        if (order.closePosition) {
            console.log("SLprice1: ", ((pos.positionEntry - order.price) / pos.positionEntry) * pos.positionAmount)
            order.executedQty = Math.abs(pos.positionAmount)
            gain = (order.price - pos.positionEntry) * pos.positionAmount
            pos.positionAmount = 0
            pos.positionEntry = 0
            console.log("Closing position with profit of: " + (gain / bot.binance!.balance[bot.coin2] * 100).toFixed() + "%")
            this.dal.logStep({ type: 'Close Position', priority: 5 }, bot)
            bot.binance!.orders[this.PAIR] = []

            if (bot.backupPrecent > 0) {
                if (-bot.binance!.balance.backup > gain * bot.backupPrecent) {
                    gain += bot.binance!.balance.backup
                    bot.profitNum -= bot.binance!.balance.backup
                    bot.binance!.balance.backup = 0

                } else {
                    bot.binance!.balance.backup += gain * bot.backupPrecent
                    bot.profitNum += gain * bot.backupPrecent
                    gain *= (1 - bot.backupPrecent)
                }

            }

            if (order.type == "STOP_MARKET") {
                bot.botStatus = BotStatus.PAUSE
                bot.lastOrder = t.time + bot.pause * 1000
            }

        } else if (qu * pos.positionAmount < 0) {
            gain = (pos.positionEntry - order.price) * order.executedQty * (order.side == "BUY" ? 1 : -1)
            pos.positionAmount += qu

        } else {
            pos.positionEntry = ((pos.positionEntry * Math.abs(pos.positionAmount)) + (order.executedQty * order.price)) / (Math.abs(pos.positionAmount) + order.executedQty);
            pos.positionAmount += qu;
        }

        order.pnl = gain

        gain -= (order.avgPrice * order.executedQty * 0.0002)
        bot.binance!.balance[bot.coin2] += gain
        bot.profitNum += gain
        

        console.log("Psition size: " + pos.positionAmount)
        console.log("Variation: " + bot.variation + " Profit: " + (bot.profitNum / 100).toFixed(2) + "% Date: " + new Date(parseInt(t.time)))

        this.dal.logStep({
            type: order.type == "STOP_MARKET" ? "StopLoose" : 'Execute',
            side: order.side,
            price: order.price,
            quantity: order.executedQty,
            high: t.high,
            low: t.low,
            positionSize: pos.positionAmount,
            positionPnl: (order.price - pos.positionEntry) * pos.positionAmount,
            profit: (bot.profitNum / 100).toFixed(0) + "%",

            balanceSecond: (bot.binance!.balance[bot.coin2]).toFixed(2),
            balanceFirst: bot.binance!.balance.backup.toFixed(2),
            priority: 1
        }, bot)


        order.status = 'FILLED'
        bot.binance!.orders[this.PAIR].push(order)

        this.openOrders = this.openOrders.filter(o => o.orderId != order.orderId)
    }

    closePosition(bot: Bot) {
        const candle = this.chart[this.currentCandle] || this.chart[this.currentCandle - 1]
        this.orderexecute(Object.assign(new Order(), {
            bot: bot,
            closePosition: true,
            price: candle.close,
            type: "STOP_MARKET",
        }), candle);

    }

    hasMoney(t: CandleStick) {
        for (const bot of this.bots) {
            const pos = bot.binance!.positions[this.PAIR + bot.positionSide()]
            const profit = (t.close - pos.positionEntry) * pos.positionAmount
            bot.lequided = -profit > bot.binance!.balance[bot.coin2]
            if (bot.lequided) {
                this.dal.logStep({ "type": "😰Liquid", low: t.close, priority: 10 }, bot)
                bot.profitNum = bot.binance!.balance.backup - 10000
                bot.binance!.balance[bot.coin2] = bot.binance!.balance.backup * (1 - bot.backupPrecent)
                bot.binance!.balance.backup *= bot.backupPrecent

                pos.positionAmount = 0
                pos.positionEntry = 0
                console.log("😰Liquid")
                bot.binance!.orders[this.PAIR] = [new Order()]
                this.openOrders = this.openOrders.filter(o => o.bot != bot)

            }
        }

    }

    simulateState(bots: Bot[]) {
        super.simulateState(bots);
        (this.sockets as SocketsFutures).markPrices[this.PAIR] = this.chart[this.currentCandle].close
    }

    addRealtimePrices(t: CandleStick) {
    }
    realtimePricesCache: number[] = []
    lastCandle: number = 0
    getRealtimePrices(s) {
        let diff = this.currentCandle - this.lastCandle
        if (!this.realtimePricesCache.length) {
            this.realtimePricesCache = this.chart.slice(this.currentCandle - 10000, this.currentCandle).map(c => c.close).reverse()

        } else {
            if (diff > 0){
            
            const lastCandles = this.chart.slice(this.lastCandle, this.currentCandle).map(c => c.close).reverse()
            this.realtimePricesCache = lastCandles.concat(this.realtimePricesCache.slice(0,-diff))
            }
        }

        this.lastCandle = this.currentCandle
        return this.realtimePricesCache
    }
}