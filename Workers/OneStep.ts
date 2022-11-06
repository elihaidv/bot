
import { BotLogger } from '../Logger';
import { Account, Bot, Key, Order } from '../Models';
import { SocketsFutures } from '../Sockets/SocketsFuture';
import { FutureTrader } from './FuturesTrader';
const cancelOrders = require('../CancelOrders');

export class OneStep extends FutureTrader {

    async placeBuy() {
        if (!this.positionAmount) {
            // await this.cancelOrders()

            let buyQu, fbuyPrice, buyPrice, average, maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number
            let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;


            fbuyPrice = maxBuyPrice * this.sub(1, this.bot.buy_percent)

            average = this.futureSockets.averagePrice(this.PAIR, this.bot.SMA)

            buyPrice = this.minFunc(fbuyPrice, average)

            buyQu = balanceLeveraged * this.bot.amount_percent / buyPrice

            BotLogger.instance.log({
                type: "BeforeBuy - OneStep",
                bot_id: this.bot._id,
                fbuyPrice, buyPrice, buyQu,
                maxBuyPrice,balance:this.balance[this.SECOND],
                positionAmount: this.positionAmount,
                positionEntry: this.positionEntry, 
                lastOrder: this.myLastOrder,
                direction: this.bot.direction
            })

            await this.place_order(this.SECOND, buyQu, buyPrice, !this.bot.direction, {})

        }


    }

    async placeSell() {

        let ticker = this.futureSockets.ticker(this.PAIR)
        let minSell = (this.bot.direction ? ticker?.bestAsk : ticker?.bestBid) as unknown as number

        BotLogger.instance.log({
            type: "BeforeSell - OneStep",
            bot_id: this.bot._id,
            minSell, ticker,balance:this.balance[this.SECOND],
            positionAmount: this.positionAmount,
            positionEntry: this.positionEntry, 
            lastOrder: this.myLastOrder,
            direction: this.bot.direction
        })

        await this.place_order(this.PAIR, 0,0,
            this.bot.direction, {
            type: "TAKE_PROFIT_MARKET",
            stopPrice: this.roundPrice(this.maxFunc(this.positionEntry * this.add(1, this.bot.take_profit), minSell)),
            closePosition: true
        })

        await this.place_order(this.PAIR, 0,0,
            this.bot.direction, {
            type: "STOP_MARKET",
            stopPrice: this.roundPrice(this.minFunc(this.positionEntry * this.sub(1, this.bot.stop_loose), minSell)),
            closePosition: true
        })
        if (!this.error) {
            this.bot.lastOrder = Bot.STABLE
        }
    }

    async cancelOrders() {
        await cancelOrders(this.bot)
    }
}