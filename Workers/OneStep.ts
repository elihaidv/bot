
import { Account, Bot, Key, Order } from '../Models';
import { SocketsFutures } from '../Sockets/SocketsFuture';
import { FutureTrader } from './FuturesTrader';
const cancelOrders = require('../CancelOrders');

export class OneStep extends FutureTrader {

    async placeBuy() {
        if (!this.positionAmount) {
            // await this.cancelOrders()

            let buyQu, buyPrice, maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number
            let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;


            buyPrice = maxBuyPrice * this.sub(1, this.bot.buy_percent)

            buyPrice = this.minFunc(buyPrice, this.futureSockets.averagePrice(this.PAIR, this.bot.SMA))

            buyQu = balanceLeveraged * this.bot.amount_percent / buyPrice

            await this.place_order(this.SECOND, buyQu, buyPrice, !this.bot.direction, {})

            if (!this.error) {
                this.bot.lastOrder = Bot.STABLE
            }
        }


    }

    async placeSell() {
        await this.place_order(this.PAIR, 0,0,
            this.bot.direction, {
            type: "TAKE_PROFIT_MARKET",
            stopPrice: this.roundPrice(this.positionEntry * this.add(1, this.bot.take_profit)),
            closePosition: true
        })

        await this.place_order(this.PAIR, 0,0,
            this.bot.direction, {
            type: "STOP_MARKET",
            stopPrice: this.roundPrice(this.positionEntry * this.sub(1, this.bot.stop_loose)),
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