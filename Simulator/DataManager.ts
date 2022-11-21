
import { exec, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises'
import { DAL } from "../DALSimulation";
import { Account, Bot, Order } from "../Models";
import { BaseSockets } from "../Sockets/BaseSockets";
import { Sockets } from "../Sockets/Sockets";
const cf = require('node-fetch-cache')
const fetch = cf.fetchBuilder.withCache(new cf.FileSystemCache({
    cacheDirectory: '/tmp/simcache',
}));
const admZip = require('adm-zip')
const Binance = require('node-binance-api');

export class DataManager {
    hasMoney(t: CandleStick): boolean {
        
        return true
        //   throw new Error("Method not implemented.");
    }
    
    chart: Array<CandleStick> = [];
    charts: { [key: string]: Array<CandleStick>; } = {};

    openOrders: Array<Order> = [];
    currentCandle = 0
    bot: Bot
    PAIR
    profit = 0;
    exchangeInfo: any
    filters: any

    currentHour = 0
    offsetInHour = 0

    readonly UNIT_TIMES = ['1h', '15m', '5m', '1m', '1s']
    readonly MIN_CHART_SIZE = 5 * 24 * 60 * 60
    readonly UNIT_HOUR_CANDLES = {
        '1h': 1,
        '15m': 4,
        '5m': 12,
        '1m': 60,
        '1s': 60 * 60
    }



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
            this.makeid(10), qu, qu, this.currentCandle, params.type || "LIMIT", params.newClientOrderId,
            this.bot.positionSide(), p)
        order.closePosition = params.closePosition

        this.openOrders.push(order)

        DAL.instance.logStep({
            type: 'OpenOrder', side: order.side, price: order.price, quantity: order.origQty, priority: 8,
            high: this.chart[this.currentCandle].high,
            low: this.chart[this.currentCandle].low,
        })
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
    async checkFileExists(filepath) {
        let flag = true;
        try {
            await fs.access(filepath);
        } catch (e) {
            flag = false;
        }
        return flag;
    }
    async fetchNextChart(start, end, unit) {

        let promises: Array<Promise<any>> = []

        let date = new Date(start)

        while (date.getTime() < end + 1000 * 60 * 60 * 24) {

            const dateString = date.toISOString().split("T")[0]

            promises.push(fetch(`https://data.binance.vision/data/spot/daily/klines/${this.PAIR}/${unit}/${this.PAIR}-${unit}-${dateString}.zip`)
                .then(res => res.buffer())
                .then(r => new admZip(r))
                .then(f => f.getEntries()[0])
                .then(zip => {
                    console.log("downloded: ", dateString, unit);
                    return zip
                })
                .catch(console.log))

            date.setDate(date.getDate() + 1)

        }
        const files = await Promise.all(promises);
        const data = files.filter(x => x)
            .map(e => e.getData().toString().split("\n")
                .filter(r => r)
                .map(x => x.split(",")
                    .map(y => parseFloat(y))))
            .flat()


        this.charts[unit] = data.map(([time, open, high, low, close]) =>
            (Object.assign(new CandleStick(), { time, high, low, close })))
    }
    async fetchAllCharts(start, end) {
        await Promise.all([
            this.fetchNextChart(start, end, "1s"),
            this.fetchNextChart(start, end, "1m"),
            this.fetchNextChart(start, end, "5m"),
            this.fetchNextChart(start, end, "15m"),
            this.fetchNextChart(start, end, "1h")
        ]);

        for (let i = this.charts["1s"].length - 1; i > 0; i--) {
            if (this.charts["1s"][i].time != this.charts["1s"][i - 1].time + 1000) {
                this.charts["1s"].splice(i, 0, Object.assign(new CandleStick(), this.charts["1s"][i]))
            }
        }


        this.chart = this.chart.slice(this.chart.length - this.MIN_CHART_SIZE)

        this.chart = this.chart.concat(this.charts["1s"]);

        this.currentHour = 0

    }

    checkOrder(orders: Array<Order>) {
        let ordersFound = orders
        for (let unit of this.UNIT_TIMES) {
            const candleIndex = this.currentHour * this.UNIT_HOUR_CANDLES[unit] + Math.floor(this.offsetInHour / (3600 / this.UNIT_HOUR_CANDLES[unit]))

            let found = false

            for (let i = 0; i < this.UNIT_HOUR_CANDLES[unit]; i++) {

                const t = this.charts[unit][candleIndex + i]
                if (!t) {
                    debugger
                }

                const ordersInInreval = ordersFound.filter(o =>
                    ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "BUY" || o.type == "STOP_MARKET" && o.side == "SELL") && o.price > t.low ||
                    ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "SELL" || o.type == "STOP_MARKET" && o.side == "BUY") && o.price < t.high)

                if (ordersInInreval.length > 0) {
                    ordersFound = ordersInInreval
                    if (unit == "1s") {
                        return ordersFound
                    }
                    found = true
                    break
                } else {
                    const offset = (3600 / this.UNIT_HOUR_CANDLES[unit]) % 3600
                    this.offsetInHour += offset
                    this.currentCandle += offset
                }
            }
            if (!found) {
                break
            }
        }   
    
        
        this.offsetInHour = 0
        this.currentCandle += 3600 - (this.currentCandle % 3600)
        if (this.chart[this.currentCandle]){
            this.currentHour =  (this.chart[this.currentCandle].time - this.charts["1h"][0].time) / 3600000 
            const diff = this.chart[this.currentCandle].time - this.charts["1h"][this.currentHour].time
            
        }
    
         return []
    }

    findIndexBetween(time: number, chart: Array<CandleStick>) {
        if (time < chart[0].time) {
            return 0
        }
        for (let i = 0; i < chart.length - 1; i++) {
            if (chart[i].time < time && chart[i + 1].time >= time) {
                return i
            }
        }
        if (time > chart[chart.length - 1].time) {
            return chart.length - 1
        }
        return -1
    }

    candlesticks = () => new Promise(resolve => Binance().candlesticks(this.PAIR, "1m", (e, t, s) => resolve(t)));

    orderexecute(order: Order, t: CandleStick) {
        const amount = order.avgPrice * order.executedQty;
        const direction = order.side == "BUY" ? 1 : -1;


        this.bot.binance!.balance[this.bot.coin2].available -= amount * direction;
        this.bot.binance!.balance[this.bot.coin2].total -= amount * direction;

        this.bot.binance!.balance[this.bot.coin1].available += order.executedQty * direction;
        this.bot.binance!.balance[this.bot.coin1].total += order.executedQty * direction;


        order.status = 'FILLED'
        this.bot.binance!.orders[this.PAIR].push(order)

        console.log("Orders Executed: ", this.bot.binance!.orders[this.PAIR].length)
        if (order.side == "SELL") {
            // console.log("balance: " + (this.bot.binance!.balance[this.bot.coin2].available))


            //Check if 
            if (this.bot.binance!.balance[this.bot.coin1].available < this.filters.MIN_NOTIONAL.minNotional / order.avgPrice) {
                DAL.instance.logStep({ type: 'Close Position', priority: 5 })
                this.bot.binance!.orders[this.PAIR] = [order]
            }
        }

        DAL.instance.logStep({
            type: order.type == "STOP_MARKET" ? "StopLoose" : 'Execute',
            side: order.side,
            high: t.high,
            low: t.low,
            price: order.price,
            quantity: order.executedQty,
            balanceSecond: (this.bot.binance!.balance[this.bot.coin2].available).toFixed(2),
            balanceFirst: (this.bot.binance!.balance[this.bot.coin1].available).toFixed(2),
            priority: 1
        })


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
        const count = Math.min(this.currentCandle, (steps * 5 * 60))
        const start = this.currentCandle - count
        return this.chart
            .map(x => x.close)
            .slice(start, this.currentCandle)
            .reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / count
    }

    averagePriceQuarter(pair) {
        const count = Math.min(this.currentCandle, (15 * 500 * 60))
        const start = this.currentCandle - count
        return this.chart
            .map(x => x.close)
            .slice(start, this.currentCandle)
            .reduce((a, b) => parseFloat(a) + parseFloat(b)) / count
    }
    simulateState() {
        // if (!this.bot.avoidCancel){
        this.openOrders = []
        // }


        this.sockets.orderBooks[this.PAIR] = {
            "asks": {},
            "bids": {},
        }
        this.sockets.orderBooks[this.PAIR].asks[this.chart[this.currentCandle].high] = 1
        this.sockets.orderBooks[this.PAIR].bids[this.chart[this.currentCandle].low] = 1
    }
    ticker(p): Ticker {
        let t = new Ticker();
        t.bestBid = this.chart[this.currentCandle].close
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