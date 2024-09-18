
import { BotLogger } from '../Logger.js';
import { Account, Bot, BotStatus, Key, Order } from '../Models.js';
import { FutureTrader } from './FuturesTrader.js';

export class OneStep extends FutureTrader {

    async placeBuy() {
        if (!this.positionAmount) {
            // await this.cancelOrders()

            
                const markPrice = this.futureSockets.markPrices[this.PAIR]
            let buyQu, fbuyPrice, buyPrice, average
            let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;


            fbuyPrice = markPrice * this.sub(1, this.bot.buy_percent)

            average = this.futureSockets.averagePrice(this.PAIR, this.bot.SMA)

            buyPrice = this.minFunc(fbuyPrice, average)

            buyQu = balanceLeveraged * this.bot.amount_percent / buyPrice

            BotLogger.instance.log({
                type: "BeforeBuy - OneStep",
                bot_id: this.bot._id,
                fbuyPrice, buyPrice, buyQu,average,
                markPrice,balance:this.balance[this.SECOND],
                positionAmount: this.positionAmount,
                positionEntry: this.positionEntry, 
                lastOrder: this.myLastOrder,
                direction: this.bot.direction
            })

            await this.place_order(this.SECOND, buyQu, buyPrice, !this.bot.direction, {})

        }


    }

    async placeSell() {

                const markPrice = this.futureSockets.markPrices[this.PAIR]

        BotLogger.instance.log({
            type: "BeforeSell - OneStep",
            bot_id: this.bot._id,
            markPrice, balance:this.balance[this.SECOND],
            positionAmount: this.positionAmount,
            positionEntry: this.positionEntry, 
            lastOrder: this.myLastOrder,
            direction: this.bot.direction
        })

        await this.place_order(this.PAIR, 0,0,
            this.bot.direction, {
            type: "TAKE_PROFIT_MARKET",
            stopPrice: this.roundPrice(this.maxFunc(this.positionEntry * this.add(1, this.bot.take_profit), markPrice)),
            closePosition: true
        })

        await this.place_order(this.PAIR, 0,0,
            this.bot.direction, {
            type: "STOP_MARKET",
            stopPrice: this.roundPrice(this.minFunc(this.positionEntry * this.sub(1, this.bot.stop_loose), markPrice)),
            closePosition: true
        })
        if (!this.error) {
            this.bot.botStatus = BotStatus.STABLE
        }
    }

}