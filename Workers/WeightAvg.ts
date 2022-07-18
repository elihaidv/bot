import { BasePlacer } from "./BasePlacer"
import { Bot, Order } from "../Models";


export class WeightAvg extends BasePlacer {
    myLastBuyAvg;
    myLastBuyCount = 0;

    async place() {

        if (!this.binance || !this.balance[this.SECOND] || !this.orders.length || !this.sockets.prices[this.PAIR] || !this.sockets.orderBooks[this.PAIR]) return

        this.parseAllValues()

        await this.buyBNB()

        this.buildHistory()

        await this.placeBuy()

        !this.isFirst() && await this.placeSell()
    }

    isFirst() {
        let maxBuyPrice = parseFloat(Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0])
        return this.balance[this.FIRST].total < (this.filters.MIN_NOTIONAL.minNotional / maxBuyPrice)
    }

    async placeBuy() {
        let buyPrice, buyQu, maxBuyPrice = Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0] as unknown as number
        let params: any = {};

        buyPrice = maxBuyPrice * (1 - this.bot.buy_percent)

        if (this.isFirst() || !this.myLastOrder) {
            params.newClientOrderId = "FIRST" + this.PAIR
        } else if (this.myLastOrder!.side == this.sellSide()) {
            buyPrice = Math.min(this.myLastOrder!.price * (1 - this.bot.take_profit), buyPrice)

        } else {
            buyPrice = Math.min(this.myLastOrder!.price * (1 - this.bot.last_distance), buyPrice)
        }

        if (this.bot.SMA) {
            buyPrice = Math.min(buyPrice, this.sockets.averagePrice(this.PAIR, this.bot.SMA))
        }

        if (this.isFirst() || !this.myLastOrder) {
            buyQu = this.balance[this.SECOND].available * this.bot.amount_percent / buyPrice

        } else if (this.myLastOrder?.side == this.sellSide()) {
            buyQu = this.myLastOrder.executedQty

        } else {
            buyQu = Math.min(this.balance[this.SECOND].available / buyPrice,
                this.myLastOrder!.origQty * (1 + this.bot.increase_factor))

            let minNotional = this.filters.MIN_NOTIONAL.minNotional
            buyQu = Math.max(buyQu , minNotional / buyPrice)
    
        }

        await this.place_order(this.SECOND, buyQu, buyPrice, true, params)
    }

    async placeSell() {

        let sellPrice, sellQu = 0


        if (this.standingBuy) {
            sellPrice = this.standingBuy.price * (1 + this.bot.take_profit)

            sellQu = this.standingBuy.executedQty

            if (sellQu < this.balance[this.FIRST].available) {

                await this.place_order(this.FIRST, sellQu, sellPrice, false, {
                    newClientOrderId: "SELL" + this.standingBuy.orderId
                })
            } else {
                sellQu = 0
            }

        }

        sellPrice = this.myLastBuyAvg * (1 + (this.bot.take_profit_position || this.bot.take_profit))

        await this.place_order(this.FIRST, this.balance[this.FIRST].available - sellQu, sellPrice, false)

        if (!this.error) {
            this.bot.lastOrder = Bot.STABLE
        }
    }


    async buyBNB() {
        if (this.bot.minbnb && this.balance["BNB"] && this.balance["BNB"].available < this.bot.minbnb && !this.PAIR.includes('BNB')) {
            try {
                const bnbPair = this.exchangeInfo.symbols?.
                    find(s => s.symbol == 'BNB' + this.SECOND) ? 'BNB' + this.SECOND : this.FIRST + 'BNB'

                await this.binance.marketBuy(bnbPair, this.bot.bnbamount)
            } catch (e) {
                // console.log(e)
            }
        }
    }

    getAction(type: boolean): Function {
        return type ? this.binance!.buy : this.binance!.sell
    }


}