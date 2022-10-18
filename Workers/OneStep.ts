
import { Account, Bot, Key, Order } from '../Models';
import { SocketsFutures } from '../Sockets/SocketsFuture';
import { FutureTrader } from './FuturesTrader';
const cancelOrders = require('../CancelOrders');

export class OneStep extends FutureTrader {

    async placeBuy() {
        if (this.positionAmount != 0) {
            this.bot.lastOrder = Bot.STABLE
        } else {
            cancelOrders(this.bot)

            let buyQu, buyPrice, maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number
            let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;


            buyPrice = maxBuyPrice * this.sub(1, this.bot.buy_percent)

            buyPrice = this.minFunc(buyPrice, this.futureSockets.averagePrice(this.PAIR, this.bot.SMA))

            buyQu = balanceLeveraged * this.bot.amount_percent / buyPrice

            await this.place_order(this.SECOND, buyQu, buyPrice, !this.bot.direction, {})

            await this.place_order(this.PAIR, buyQu,
                buyPrice * this.add(1, this.bot.take_profit),
                this.bot.direction, {
                type: "STOP",
                stopPrice: this.roundPrice(buyPrice),
                reduceOnly: true
            })

            await this.place_order(this.PAIR, buyQu,
                buyPrice * this.sub(1, this.bot.stop_loose),
                this.bot.direction, {
                type: "STOP",
                stopPrice: this.roundPrice(buyPrice),
                reduceOnly: true
            })
        }


    }

    async placeSell() {
    }
}