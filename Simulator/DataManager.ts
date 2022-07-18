const fs = require('fs').promises
import { DAL } from "../DAL";
import { Account, Bot, Order } from "../Models";
import { BaseSockets } from "../Sockets/BaseSockets";
import { Sockets } from "../Sockets/Sockets";
import { SocketsFutures } from "../Sockets/SocketsFuture";

const Binance = require('node-binance-api');

export class DataManager {
    hasMoney(t: CandleStick): boolean {
        return true
        //   throw new Error("Method not implemented.");
    }
    chart: Array<CandleStick> = [];
    openOrders: Array<Order> = [];
    time = 0
    bot: Bot
    PAIR
    profit = 0;
    exchangeInfo: any
    filters: any

    sockets: BaseSockets

    constructor(bot: Bot) {
        this.bot = bot
        this.PAIR = this.bot.coin1 + this.bot.coin2
        this.sockets = Sockets.getInstance()


        this.sockets.averagePrice = this.averagePrice.bind(this)
        this.sockets.averagePriceQuarter = this.averagePriceQuarter.bind(this)

    }

    setExchangeInfo(_exchangeInfo) {
        this.exchangeInfo = _exchangeInfo
        this.filters = _exchangeInfo.symbols.find(s => s.symbol == this.PAIR).filters.reduce((a, b) => { a[b.filterType] = b; return a }, {})
    }

    openOrder = (type) => ((coin, qu, price, params?) => {
        const p = price || params.stopPrice || params.activationPrice
        // if (type ? p > this.chart[this.time].high :  p < this.chart[this.time].low) {
        //     return {msg:"Order Expire"}
        // }
        const order = new Order(type ? 'BUY' : "SELL", "NEW", p,
            this.makeid(10), qu, qu, this.time, params.type || "LIMIT", params.newClientOrderId,
            this.bot.positionSide(), p)
        order.closePosition = params.closePosition

        this.openOrders.push(order)

        DAL.instance.logStep({ type: 'OpenOrder', side: order.side, price: order.price, quantity: order.origQty })
        return order
    });
    makeid(length): string {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    }

    async fetchChart() {
        const file = await fs.readFile('cryptoHistory/' + this.PAIR)
        const data = file.toString().split('\n').map(l => l.split(","))

        if (!process.argv[3]) {
            this.time = 0

        } else if (isNaN(process.argv[3] as any)) {
            const minutes = Math.round((parseInt(data.at(-2)[0]) - new Date(process.argv[3]).getTime()) / 1000 / 60)
            this.time = data.length - minutes

        } else {
            this.time = data.length - parseInt(process.argv[3])
        }
        this.time = Math.max(this.time, this.bot.SMA * 5)


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
        if (order.side == "SELL") {
            console.log("balance: " + (this.bot.binance!.balance[this.bot.coin2].available))
            DAL.instance.logStep({ type: 'Balance', 
                balanceSecond: (this.bot.binance!.balance[this.bot.coin2].available), 
                balanceFirst: (this.bot.binance!.balance[this.bot.coin1].available) })

            //Check if 
            if (this.bot.binance!.balance[this.bot.coin1].available < this.filters.MIN_NOTIONAL.minNotional / order.avgPrice) {
                DAL.instance.logStep({ type: 'Close Position'}) 
            }
        }
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
        const start = Math.max(this.time - (steps * 5), 0)
        return this.chart.map(x => x.close).slice(start, this.time).reduce((a, b) => parseFloat(a) + parseFloat(b)) / (steps * 5)
    }

    averagePriceQuarter(pair) {
        return this.chart.map(x => x.close).slice(Math.max(this.time - 1500, 0), this.time).reduce((a, b) => parseFloat(a) + parseFloat(b)) / 1500
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
        t.bestBid = this.chart[this.time].close
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