
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
    hoursChart: Array<CandleStick> = []

    openOrders: Array<Order> = [];
    currentCandle = 0
    bot: Bot
    PAIR
    profit = 0;
    exchangeInfo: any
    filters: any
    dal = new DAL()

    // currentHour = 0
    // offsetInHour = 0
    currentCandleStick: CandleStick | undefined

    readonly UNIT_TIMES = ['1h', '15m', '5m', '1m', '1s']
    readonly MIN_CHART_SIZE = 300 * 24 * 60 * 60
    // readonly UNIT_HOUR_CANDLES = {
    //     '1h': 1,
    //     '15m': 4,
    //     '5m': 12,
    //     '1m': 60,
    //     '1s': 60 * 60
    // }

    readonly UNIT_NEXT_LEVEL = {
        '1s': 60,
        '1m': 5,
        '5m': 3,
        '15m': 4,
        '1h': 1
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
            this.makeid(10), qu, qu, this.chart[this.currentCandle].time, params.type || "LIMIT", params.newClientOrderId,
            this.bot.positionSide(), p)
        order.closePosition = params.closePosition

        this.openOrders.push(order)

        this.dal.logStep({
            type: 'OpenOrder', side: order.side, price: order.price, quantity: order.origQty, priority: 8,
            high: this.chart[this.currentCandle].high,
            low: this.chart[this.currentCandle].low,
            sma: this.chart[this.currentCandle].sma,
            longSMA: this.chart[this.currentCandle].longSMA,
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



            promises.push(
                this.dal.getHistoryFromBucket(this.PAIR, unit, dateString)
                    .then(res => res ? res :
                        fetch(`https://data.binance.vision/data/spot/daily/klines/${this.PAIR}/${unit}/${this.PAIR}-${unit}-${dateString}.zip`)
                            .then(res => res.buffer())
                            .then(r => new admZip(r))
                            .then(f => f.getEntries()[0].getData().toString())
                            .then(s => this.dal.saveHistoryInBucket(s, this.PAIR, unit, dateString)))
                    .then(zip => {
                        console.log("downloded: ", dateString, unit);
                        return zip
                    })
                    .catch(console.error))

            date.setDate(date.getDate() + 1)

        }
        const files = await Promise.all(promises);
        const data = files.filter(x => x).flat()

        this.charts[unit] = data.map(([time, high, low, close]) =>
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

        let closeSum = 0
        let sma = this.bot.SMA * 5 * 60
        let closeSumLong = 0
        let longSMA = this.bot.longSMA * 15 * 60

        for (let i = 0; i < this.chart.length; i++) {
            if (i >= sma) {
                closeSum -= this.chart[i - sma].close
            }

            if (i >= longSMA) {
                closeSumLong -= this.chart[i - longSMA].close
            }

            closeSum += this.chart[i].close
            this.chart[i].sma = closeSum / Math.min(i + 1, sma)

            closeSumLong += this.chart[i].close
            this.chart[i].longSMA = closeSumLong / Math.min(i + 1, longSMA)

        }


        for (let unitIndex = 0; unitIndex < this.UNIT_TIMES.length; unitIndex++) {
            const unit = this.UNIT_TIMES[unitIndex]

            for (let i = 0; i < this.charts[unit].length - 1; i++) {
                if (this.charts[unit][i + 1]) {
                    this.charts[unit][i].next = this.charts[unit][i + 1]
                }
                if (unitIndex > 0) {
                    const parent = this.charts[this.UNIT_TIMES[unitIndex - 1]][Math.floor(i / this.UNIT_NEXT_LEVEL[unit])]
                    this.charts[unit][i].parent = parent
                    parent.children.push(this.charts[unit][i])
                }
            }
        }
        this.hoursChart = this.charts["1h"]
        // this.charts = {}
    }

    checkOrder(orders: Array<Order>, secounds: number) {
        let ordersFound = orders

        if (!this.currentCandleStick) {
            this.currentCandleStick = this.hoursChart[Math.floor((this.chart[this.currentCandle].time - this.hoursChart[0].time) / 3600 / 1000)]
        } else {
            this.currentCandleStick = this.currentCandleStick?.next ?? this.currentCandleStick?.parent?.next
            if (!this.currentCandleStick) {
                return []
            }
        }

        let maxTime = this.chart[this.currentCandle].time + secounds * 1000
        let candle = this.currentCandleStick

        while (true) {
            const ordersInInreval = ordersFound.filter(o =>
                ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "BUY" || o.type == "STOP_MARKET" && o.side == "SELL") && o.price > candle.low ||
                ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "SELL" || o.type == "STOP_MARKET" && o.side == "BUY") && o.price < candle.high)

            if (ordersInInreval.length == 0) {
                if (secounds > 0 && candle.time > maxTime) {
                    this.currentCandleStick = candle
                    this.currentCandle = (candle.time - this.chart[0].time) / 1000
                    return []
                }
                if (candle.next) {
                    candle = candle.next
                } else {
                    if (candle.parent && candle.parent.next) {
                        candle = candle.parent.next
                    } else {
                        this.currentCandle = -1
                        this.currentCandleStick = undefined
                        return []
                    }
                }
            } else {
                if (candle.children.length) {
                    candle = candle.children[0]
                } else {
                    this.currentCandleStick = candle
                    this.currentCandle = (candle.time - this.chart[0].time) / 1000
                    return ordersInInreval
                }
            }
        }


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
                this.dal.logStep({ type: 'Close Position', priority: 5 })
                this.bot.binance!.orders[this.PAIR] = [order]
            }
        }

        this.dal.logStep({
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
        return this.chart[this.currentCandle].sma

    }
    averagePriceQuarter(pair) {
        return this.chart[this.currentCandle].longSMA
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
        t.bestAsk = this.chart[this.currentCandle].close
        return t
    }
}

export class CandleStick {
    time; high; low; close;
    next: CandleStick | undefined;
    parent: CandleStick | undefined;
    children: CandleStick[] = [];
    sma; longSMA;
}


class Ticker {
    pair: String | undefined;
    stream: String | undefined;
    bestAsk: String | undefined;
    bestBid: String | undefined;
}