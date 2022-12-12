import { Bot, Order } from "../Models";
import { WeightAvg } from "./WeightAvg";


export class Periodically extends WeightAvg {

    async place() {

        if (!this.binance || !this.balance[this.SECOND] || !this.orders.length || !this.sockets.prices[this.PAIR] || !this.sockets.orderBooks[this.PAIR]) return

        this.parseAllValues()

        await this.buyBNB()

        this.buildHistory()

        await this.placeOrder()

    }

    async placeOrder() {
        let maxBuyPrice = parseFloat(Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0])

        let side = this.isFirst || this.myLastBuyAvg > maxBuyPrice
        this.place_order(this.SECOND, 12/maxBuyPrice, maxBuyPrice, side)
    }

}