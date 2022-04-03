import { Bot, Order } from "../Models";
import { SocketsFutures } from "../Sockets/SocketsFuture";
import { CandleStick, DataManager } from "./DataManager";

export class FutureDataManager extends DataManager {

    constructor(bot: Bot) {
        super(bot);
        this.sockets = SocketsFutures.getFInstance()
        this.sockets.averagePrice = this.averagePrice.bind(this)
        this.sockets.averagePriceQuarter = this.averagePriceQuarter.bind(this)
        
        if (this.sockets instanceof SocketsFutures) {
            this.sockets.ticker = this.ticker.bind(this)
        }
    }


    orderexecute(order: Order) {
        let qu = (order.side == "BUY" ? 1 : -1) * order.executedQty

        let gain = 0

        const pos = this.bot.binance!.positions[this.PAIR + this.bot.positionSide()]

       
        if (order.closePosition){
            gain = (order.price - pos.positionEntry) * pos.positionAmount
            pos.positionAmount = 0
            pos.positionEntry = 0
            console.log("Closing position")
        } else if (qu == 0) {
            gain = (pos.positionEntry - order.price) * pos.positionAmount * (order.side == "BUY" ? 1 : -1)
            pos.positionEntry = 0
            pos.positionAmount = 0
        } else if (qu * pos.positionAmount < 0) {
            gain = (pos.positionEntry - order.price) * Math.min(order.executedQty, pos.positionAmount) * (order.side == "BUY" ? 1 : -1)
            pos.positionAmount += qu

            if (order.executedQty > pos.positionAmount) {
                pos.positionEntry = order.price
            }
        }  else {
            pos.positionEntry = ((pos.positionEntry * Math.abs(pos.positionAmount)) + (order.executedQty * order.price)) / (Math.abs(pos.positionAmount) + order.executedQty);
            pos.positionAmount += qu;
        }

        gain -= (order.avgPrice * order.executedQty * 0.0002)
        this.bot.binance!.balance[this.bot.coin2] += gain
        this.profit += gain
        console.log("Profit: " + (this.profit / 100).toFixed(0) + "% Date: " + new Date(parseInt(this.chart[this.time].time)))


        order.pnl = gain
        order.status = 'FILLED'
        this.bot.binance!.orders[this.PAIR].push(order)
    }

    closePosition(price) {
        this.bot.binance!.balance[this.bot.coin2] += this.bot.binance!.balance[this.bot.coin1] * price;
        this.bot.binance!.balance[this.bot.coin1] = 0


    }

    hasMoney(t:CandleStick) :boolean{
        const pos = this.bot.binance!.positions[this.PAIR + this.bot.positionSide()]
        const profit = (t.close - pos.positionEntry) * pos.positionAmount
        return -profit < this.bot.binance!.balance[this.bot.coin2]
    }
}