const fs  = require('fs').promises
import { Account, Bot, Order } from "../Models";
import { BaseSockets } from "../Sockets/BaseSockets";
import { Sockets } from "../Sockets/Sockets";
import { SocketsFutures } from "../Sockets/SocketsFuture";

const Binance = require('node-binance-api');

export class DataManager {
    hasMoney(t:CandleStick) : boolean {
        return true
    //   throw new Error("Method not implemented.");
    }
    chart: Array<CandleStick> = [];
    openOrders: Array<Order> = [];
    time = 0
    bot: Bot
    PAIR
    profit = 0;

    sockets: BaseSockets

    constructor(bot: Bot) {
        this.bot = bot
        this.PAIR = this.bot.coin1 + this.bot.coin2
        this.sockets = Sockets.getInstance()


        this.sockets.averagePrice = this.averagePrice.bind(this)
        this.sockets.averagePriceQuarter = this.averagePriceQuarter.bind(this)
    }

    openOrder = (type) => ((coin, qu, price, params?) => {
        const p = price || params.stopPrice || params.activationPrice
        // if (type ? p > this.chart[this.time].high :  p < this.chart[this.time].low) {
        //     return {msg:"Order Expire"}
        // }
        const order = new Order(type ? 'BUY' : "SELL", "NEW", p,
            this.time.toString(), qu, qu, this.time, params.type || "LIMIT", params.newClientOrderId,
            this.bot.positionSide(), p)
            order.closePosition = params.closePosition

        this.openOrders.push(order)
        return order
    });

    async fetchChart() {
        const file = await fs.readFile('cryptoHistory/' + this.PAIR)
        const data = file.toString().split('\n').map(l=>l.split(","))
        this.time = process.argv[3] ? data.length - parseInt(process.argv[3]) : 0
        this.chart = data.map(([time, high, low, close]) =>
            (Object.assign(new CandleStick(), { time, high, low, close })));
    }

    candlesticks = () => new Promise(resolve => Binance().candlesticks(this.PAIR, "1m", (e, t, s) => resolve(t)));

    orderexecute(order: Order) {
        const amount = order.avgPrice * order.executedQty;
        const direction = order.side == "BUY" ? 1 : -1;


        this.bot.binance!.balance[this.bot.coin2].available -= amount * direction;
        this.bot.binance!.balance[this.bot.coin2].total -= amount * direction;

        this.bot.binance!.balance[this.bot.coin1].available += order.executedQty * direction;
        this.bot.binance!.balance[this.bot.coin1].total += order.executedQty * direction;


        order.status = 'FILLED'
        this.bot.binance!.orders[this.PAIR].push(order)
    }

    closePosition(price) {
        this.bot.binance!.balance[this.bot.coin2].available += this.bot.binance!.balance[this.bot.coin1].available * price;
        this.bot.binance!.balance[this.bot.coin2].total += this.bot.binance!.balance[this.bot.coin1].total * price;

        this.bot.binance!.balance[this.bot.coin1].available = 0
        this.bot.binance!.balance[this.bot.coin1].total = 0

        this.profit = this.bot.binance!.balance[this.bot.coin2].available - 10000
    }

    initData() {

        this.bot.binance = new Account(Binance());
        this.bot.binance.balance = {}
        this.bot.binance.balance[this.bot.coin2] = this.bot.isFuture ? 10000 : {
            available: 10000,
            total: 10000
        }
        this.bot.binance.balance[this.bot.coin1] = this.bot.isFuture ? 0 : {
            available: 0,
            total: 0
        }

        this.bot.binance.orders = [{}]
        this.bot.binance.positions = []
        this.bot.binance.socket = {
            prices: {},
            orderBooks: {}
        }
        this.bot.binance.orders[this.PAIR] = [new Order()]

        this.sockets.prices[this.PAIR] = 1


        this.bot.binance!.positions = {};
        
        this.bot.binance!.positions[this.PAIR + this.bot.positionSide()] ||= {
            positionAmount: 0,
            positionEntry: 0
        }

    }

    averagePrice(pair, steps) {
        return this.chart.map(x => x.close).slice(Math.max(this.time - steps,0), this.time + steps).reduce((a, b) => parseFloat(a) + parseFloat(b)) / steps
    }

    averagePriceQuarter(pair) {
        return this.chart.map(x => x.close).slice(Math.max(this.time - 1500,0), this.time + 1).reduce((a, b) => parseFloat(a) + parseFloat(b)) / 1500
    }
    simulateState() {
        this.openOrders = []


        this.sockets.orderBooks[this.PAIR] = {
            "asks": {},
            "bids": {},
        }
        this.sockets.orderBooks[this.PAIR].asks[this.chart[this.time].high] = 1
        this.sockets.orderBooks[this.PAIR].bids[this.chart[this.time].low] = 1
    }
    ticker(p): Ticker {
        let t = new Ticker();
        t.bestBid = this.chart[this.time].low
        return t
    }
}

export class CandleStick {
    time; high; low; close;
}


class Ticker {
    pair: String | undefined;
    stream: String | undefined;
    bestAsk: String | undefined;
    bestBid: String | undefined;
}