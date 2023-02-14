
import { exec, spawn } from 'node:child_process';
import * as fs from 'node:fs/promises'
import { DAL } from "../DALSimulation.js";
import { Account, Bot, BotStatus, Order } from "../Models.js";
import { BaseSockets } from "../Sockets/BaseSockets.js";
import { Sockets } from "../Sockets/Sockets.js";
import fetch, { Response } from 'node-fetch';
import admZip from 'adm-zip'

import Binance from 'node-binance-api';
import crypto from 'crypto';

export const SECONDS_IN_DAY = 24 * 60 * 60

const UNIT_TIMES = ['1h', '15m', '5m', '1m', '15s', '5s', '1s']
export const MIN_CHART_SIZE = 5 * SECONDS_IN_DAY

// readonly UNIT_HOUR_CANDLES = {
//     '1h': 1,
//     '15m': 4,
//     '5m': 12,
//     '1m': 60,
//     '1s': 60 * 60
// }

const UNIT_NEXT_LEVEL = {
    '1s': 5,
    '5s': 3,
    '15s': 4,
    '1m': 5,
    '5m': 3,
    '15m': 4,
    '1h': 1
}

const SECOUNDS_IN_UNIT = {
    '1s': 1,
    '5s': 5,
    '15s': 15,
    '1m': 60,
    '5m': 60 * 5,
    '15m': 60 * 15,
    '1h': 60 * 60
}
export class DataManager {
    hasMoney(t: CandleStick) {

        //   throw new Error("Method not implemented.");
    }

    chart: Array<CandleStick> = [];
    charts: { [key: string]: Array<CandleStick>; } = {};
    historyCandles: Array<CandleStick> = []

    openOrders: Array<Order> = [];
    currentCandle = 0
    bots: Bot[]
    PAIR
    exchangeInfo: any
    filters: any
    dal = new DAL()

    minHistoryCandles = 0

    // currentHour = 0
    // offsetInHour = 0
    currentCandleStick: CandleStick | undefined





    sockets: BaseSockets

    constructor(bots: Bot[]) {
        this.bots = bots
        this.PAIR = this.bots[0].coin1 + this.bots[0].coin2
        this.sockets = Sockets.getInstance()



        this.sockets.averagePrice = this.averagePrice.bind(this)
        this.sockets.averagePriceQuarter = this.averagePriceQuarter.bind(this)

    }

    setExchangeInfo(_exchangeInfo) {
        this.exchangeInfo = _exchangeInfo
        this.filters = _exchangeInfo.symbols.find(s => s.symbol == this.PAIR).filters.reduce((a, b) => { a[b.filterType] = b; return a }, {})
    }

    openOrder = (bot) => (type) => ((coin, qu, price, params?) => {
        const p = price || params.stopPrice || params.activationPrice
        // if (type ? p > this.chart[this.time].high :  p < this.chart[this.time].low) {
        //     return {msg:"Order Expire"}
        // }
        const order = new Order(type ? 'BUY' : "SELL", "NEW", p,
            this.makeid(10), qu, qu, this.chart[this.currentCandle].time, params.type || "LIMIT", params.newClientOrderId,
            bot.positionSide(), p)
        order.bot = bot
        order.closePosition = params.closePosition

        this.openOrders.push(order)

        this.dal.logStep({
            type: 'OpenOrder', side: order.side, price: order.price, quantity: order.origQty, priority: 8,
            high: this.chart[this.currentCandle].high,
            low: this.chart[this.currentCandle].low,
            sma: this.averagePrice(null, bot.SMA),
            longSMA: this.averagePriceQuarter(null, bot.longSMA),
        }, bot)
        return order
    });
    makeid(length): string {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
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
    failed: string[] = []
    async fetchFile(unit, dateString) {
        try {

            const res = await this.dal.getHistoryFromBucket(this.PAIR, unit, dateString)
            if (res) {
                if (dateString == new Date().toISOString().split('T')[0]) {
                    return await this.fetchDayData(unit, dateString, res)
                }
                console.log("File exists in bucket", dateString, unit)
                return res
            }
            const bytes = await fetch(`https://data.binance.vision/data/spot/daily/klines/${this.PAIR}/${unit}/${this.PAIR}-${unit}-${dateString}.zip`)
                .then(r => r.buffer())
            const fileChecksum = crypto.createHash('sha256').update(bytes).digest("hex")

            const checksum = await fetch(`https://data.binance.vision/data/spot/daily/klines/${this.PAIR}/${unit}/${this.PAIR}-${unit}-${dateString}.zip.CHECKSUM`)
                .then(res => res.text())
                .then(text => text.split(" ")[0])

            if (checksum != fileChecksum) {
                this.failed.push(dateString)
                console.log("Error in:", dateString, unit)
                throw new Error("Checksum not match")
            }

            const file = new admZip(bytes).getEntries()[0].getData().toString()

            if (file.length == 0) {
                console.error("Length is Zero.", dateString, unit)
            }

            const r = await this.dal.saveHistoryInBucket(file, this.PAIR, unit, dateString)
            console.log("downloded: ", dateString, unit);
            return r
        } catch (e) {
            if (new Date(dateString).getTime() > new Date().getTime() - 1000 * 60 * 60 * 24 * 3) {
                return await this.fetchDayData(unit, dateString)
            }
            console.log("Error in:", dateString, unit, e)
            this.failed.push(dateString)
            return
        }
    }
    fetchDayData = async (unit, dateString, past:any = []) => {
        let t = past.length == 0 ? new Date(dateString).getTime() : past.at(-1)[0] + 1000
        const end = Math.min(new Date(dateString).getTime() + SECONDS_IN_DAY * 1000 - 1000, new Date().getTime())
        const promises: Array<Promise<any>> = []

        while (t < end) {
            promises.push(this.fetchRetry(`https://api.binance.us/api/v3/klines?symbol=${this.PAIR}&interval=1s&startTime=${t}&endTime=${end}&limit=1000`)
                .then(r => r.json()))

            t += 1000 * 1000
            if (promises.length % 10 == 0) {
                await Promise.all(promises)
            }
        }
        const res = await Promise.all(promises)

        const resStr = past.map(l => {l.splice(1,0,0);return l})
            .concat(res.flat())
            .map(e => e.toString())
            .join("\n")

        return await this.dal.saveHistoryInBucket(resStr, this.PAIR, unit, dateString)
    }

    processFile = (unit, dateString, date,) => this.fetchFile(unit, dateString)
        .then(d => d.map(([time, high, low, close]) =>
            (Object.assign(new CandleStick(), { time, high, low, close }))))
        .then(d => this.buildCharts(d, date))
        .then(d => this.connectCharts(d));

    async fetchNextChart(start, end, unit): Promise<{ [k: string]: Array<CandleStick> }> {

        let promises: { [k: string]: Promise<{ [k: string]: Array<CandleStick> }> } = {}

        let date = new Date(start - start % (SECONDS_IN_DAY * 1000))

        while (date.getTime() <= end) {

            const dateString = date.toISOString().split("T")[0]

            promises[dateString] = this.processFile(unit, dateString, date.getTime())

            date.setDate(date.getDate() + 1)

        }
        await Promise.all(Object.values(promises));

        while (this.failed.length > 0) {
            const tempFailed = this.failed
            this.failed = []
            for (const f of tempFailed) {
                promises[f] = this.processFile(unit, f, new Date(f).getTime())
            }
            await Promise.all(Object.values(promises));
        }

        const files = await Promise.all(Object.values(promises));

        return files.reduce((a, b) => {
            Object.keys(b).forEach(k => {
                a[k].at(-1)!.next = b[k].at(0)
                a[k] = a[k].concat(b[k])
            })

            return a
        })
    }
    buildCharts(seconds: CandleStick[], start): { [k: string]: Array<CandleStick> } {
        const highers = {}
        const lowers = {}
        const charts: { [k: string]: Array<CandleStick> } = {}

        seconds = this.paddEmptyCandles(seconds, start)

        UNIT_TIMES.forEach(unit => {
            charts[unit] ||= []
            highers[unit] = 0
            lowers[unit] = Infinity
        })
        const length = seconds.length + 1
        for (let i = 1; i < length; i++) {
            const candle = seconds[i - 1]
            for (let j = 0; j < UNIT_TIMES.length - 1; j++) {
                const unit = UNIT_TIMES[j]

                if (highers[unit] < candle.high) {
                    highers[unit] = candle.high
                }

                if (lowers[unit] > candle.low) {
                    lowers[unit] = candle.low
                }


                if (i && i % SECOUNDS_IN_UNIT[unit] == 0) {
                    charts[unit].push(Object.assign(new CandleStick(), {
                        time: candle.time - SECOUNDS_IN_UNIT[unit] * 1000 + 1000,
                        high: highers[unit],
                        low: lowers[unit],
                        close: candle.close
                    }))
                    highers[unit] = 0
                    lowers[unit] = Infinity
                }
            }
        }
        charts["1s"] = seconds
        return charts

    }
    paddEmptyCandles(chart, start) {
        let diff = chart.at(0)?.time - start
        if (diff != 0) {
            const items = Array.from({ length: diff / 1000 }, (_, j) => {
                const newCandle = Object.assign(new CandleStick(), chart.at(0))
                newCandle.time = start + 1000 * j
                return newCandle
            })
            chart = items.concat(chart)
        }

        diff = start + SECONDS_IN_DAY * 1000 - chart.at(-1)?.time
        if (diff != 1000) {
            const items = Array.from({ length: diff / 1000 - 1 }, (_, j) => {
                const newCandle = Object.assign(new CandleStick(), chart.at(-1))
                newCandle.time += 1000 * (j + 1)
                return newCandle
            })
            chart = chart.concat(items)
        }

        let copiedChart: CandleStick[] = []
        for (let i = 0; i < chart.length - 1; i++) {
            copiedChart.push(chart[i])
            const diff = chart[i + 1].time - chart[i].time
            if (diff > 1000) {
                const items = Array.from({ length: diff / 1000 - 1 }, (_, j) => {
                    const newCandle = Object.assign(new CandleStick(), chart[i])
                    newCandle.time += 1000 * (j + 1)
                    return newCandle
                })
                copiedChart = copiedChart.concat(items)
            } else if (diff < 0) {
                debugger
            }
        }
        const d = new Date()
        copiedChart.push(chart.at(-1)!)
        return copiedChart
    }

    calculateSmas() {
        let smas = Array.from(new Set(this.bots.map(bot => bot.SMA)))
        let closeSum = Array(smas.length).fill(0)
        let longSMAs = Array.from(new Set(this.bots.map(bot => bot.longSMA * 3)))
        let closeSumLong = Array(longSMAs.length).fill(0)
        const chart = this.historyCandles

        for (let i = 0; i < chart.length; i++) {
            const candle = chart[i]
            candle.sma ||= {}
            candle.longSMA ||= {}

            for (let j = 0; j < smas.length; j++) {

                const shortSma = smas[j]
                const longSma = longSMAs[j]
                if (i >= shortSma) {
                    closeSum[j] -= chart[i - shortSma].close
                }

                if (i >= longSma) {
                    closeSumLong[j] -= chart[i - longSma].close
                }

                closeSum[j] += candle.close

                let count = shortSma
                if (count > i + 1) {
                    count = i + 1
                }
                candle.sma[shortSma] = closeSum[j] / count

                closeSumLong[j] += candle.close

                count = longSma
                if (count > i + 1) {
                    count = i + 1
                }
                candle.longSMA[longSma] = closeSumLong[j] / count
            }
        }
    }

    connectCharts(charts: { [k: string]: Array<CandleStick> }): { [k: string]: Array<CandleStick> } {
        for (let unitIndex = 0; unitIndex < UNIT_TIMES.length; unitIndex++) {
            const unit = UNIT_TIMES[unitIndex]

            for (let i = 0; i < charts[unit].length; i++) {
                if (charts[unit][i + 1]) {
                    charts[unit][i].lastChild = unit != "1h" && (i + 1) % UNIT_NEXT_LEVEL[unit] == 0
                    charts[unit][i].next = charts[unit][i + 1]
                }
                if (unitIndex > 0) {
                    const parent = charts[UNIT_TIMES[unitIndex - 1]][Math.floor(i / UNIT_NEXT_LEVEL[unit])]
                    charts[unit][i].parent = parent
                    if (!parent) {
                        debugger
                    } else {
                        parent.children.push(charts[unit][i])
                    }
                }
            }
        }
        return charts
    }

    async fetchAllCharts(start, end) {
        const charts = await this.fetchNextChart(start, end, "1s")

        this.chart = charts["1s"]


        this.historyCandles = this.historyCandles.slice(Math.max(0, this.historyCandles.length - this.minHistoryCandles * 3))
        this.historyCandles = this.historyCandles.concat(charts["5m"])

        this.calculateSmas()
    }

    checkOrder(orders: Array<Order>) {


        if (!this.chart[this.currentCandle]) {
            // debugger
            return []
        }

        if (!this.currentCandleStick) {
            this.currentCandleStick = this.chart[this.currentCandle]
        } else {
            this.currentCandleStick = this.currentCandleStick?.next ?? this.currentCandleStick?.parent?.next
            if (!this.currentCandleStick) {
                return []
            }
        }

        let maxTime = orders.filter(o => o.bot!.status != BotStatus.STABLE)
            .reduce((a, o) => Math.min(a, o.time + o.bot!.secound * 1000), Number.MAX_SAFE_INTEGER)
        let candle = this.currentCandleStick

        while (true) {
            const ordersInInreval = orders.filter(o =>
                ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "BUY" || o.type == "STOP_MARKET" && o.side == "SELL") && o.price > candle.low ||
                ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "SELL" || o.type == "STOP_MARKET" && o.side == "BUY") && o.price < candle.high)



            if (!ordersInInreval.length) {
                if (candle.time > maxTime) {
                    this.currentCandle = (maxTime - this.chart[0].time) / 1000
                    this.currentCandleStick = this.chart[this.currentCandle]
                    if (!this.chart[this.currentCandle]) {
                        debugger
                    }
                    return []
                }
                if (candle.next && !candle.lastChild) {
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


    orderexecute(order: Order, t: CandleStick) {
        const bot = order.bot || this.bots[0]
        const amount = order.avgPrice * order.executedQty;
        const direction = order.side == "BUY" ? 1 : -1;


        bot.binance!.balance[bot.coin2].available -= amount * direction;
        bot.binance!.balance[bot.coin2].total -= amount * direction;

        bot.binance!.balance[bot.coin1].available += order.executedQty * direction;
        bot.binance!.balance[bot.coin1].total += order.executedQty * direction;


        order.status = 'FILLED'
        bot.binance!.orders[this.PAIR].push(order)

        console.log("Orders Executed: ", bot.binance!.orders[this.PAIR].length)
        if (order.side == "SELL") {
            // console.log("balance: " + (bot.binance!.balance[bot.coin2].available))


            //Check if 
            if (bot.binance!.balance[bot.coin1].available < this.filters.MIN_NOTIONAL.minNotional / order.avgPrice) {
                this.dal.logStep({ type: 'Close Position', priority: 5 }, bot)
                bot.binance!.orders[this.PAIR] = [order]
            }
        }

        this.dal.logStep({
            type: order.type == "STOP_MARKET" ? "StopLoose" : 'Execute',
            side: order.side,
            high: t.high,
            low: t.low,
            price: order.price,
            quantity: order.executedQty,
            balanceSecond: (bot.binance!.balance[bot.coin2].available).toFixed(2),
            balanceFirst: (bot.binance!.balance[bot.coin1].available).toFixed(2),
            priority: 1
        }, bot)


    }

    closePosition() {
        for (let i = 0; i < this.bots.length; i++) {
            const bot = this.bots[i];
            const price = this.chart[this.currentCandle].close
            bot.binance!.balance[bot.coin2].available += bot.binance!.balance[bot.coin1].available * price;
            bot.binance!.balance[bot.coin2].total += bot.binance!.balance[bot.coin1].total * price;

            bot.binance!.balance[bot.coin1].available = 0
            bot.binance!.balance[bot.coin1].total = 0

            bot.profitNum = bot.binance!.balance[bot.coin2].available - 10000
        }
    }

    initData() {

        for (let bot of this.bots) {
            bot.binance = new Account(new Binance());
            bot.binance.balance = {}
            bot.binance.balance[bot.coin2] = bot.isFuture ? 10000 : {
                available: 10000,
                total: 10000
            }
            bot.binance.balance[bot.coin1] = bot.isFuture ? 0 : {
                available: 0,
                total: 0
            }
            bot.binance.balance.backup = 0

            bot.binance.orders = [{}]
            bot.binance.positions = []
            bot.binance.socket = {
                prices: {},
                orderBooks: {}
            }
            bot.binance.orders[this.PAIR] = [new Order()]

            this.sockets.prices[this.PAIR] = 1


            bot.binance!.positions = {};

            bot.binance!.positions[this.PAIR + bot.positionSide()] ||= {
                positionAmount: 0,
                positionEntry: 0
            }
        }

    }
    averagePrice(pair, steps) {
        return this.chart[this.currentCandle].parent?.parent?.parent?.parent?.sma[steps]

    }
    averagePriceQuarter(pair, steps) {
        return this.chart[this.currentCandle].parent?.parent?.parent?.parent?.longSMA[steps * 3]
    }
    // averagePrice(pair, steps) {
    //     const count = Math.min(this.currentCandle, (steps * 5 * 60))
    //     const start = this.currentCandle - count
    //     return this.chart
    //         .map(x => x.close)
    //         .slice(start, this.currentCandle)
    //         .reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / count
    // }

    // averagePriceQuarter(pair,steps) {
    //     const count = Math.min(this.currentCandle, (15 * steps * 60))
    //     const start = this.currentCandle - count
    //     return this.chart
    //         .map(x => x.close)
    //         .slice(start, this.currentCandle)
    //         .reduce((a, b) => parseFloat(a) + parseFloat(b)) / count
    // }
    simulateState(bots: Bot[]) {
        // if (!this.bot.avoidCancel){

        this.openOrders = this.openOrders.filter(o => !bots.includes(o.bot!))
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

    async fetchRetry(url): Promise<Response> {
        let retry = 3

        while (retry > 0) {
            try {
                return await fetch(url)
            } catch (e) {
                retry = retry - 1
                if (retry === 0) {
                    throw e
                }

                console.log("pausing..");
                await this.sockets.timeout(1000);
                console.log("done pausing...");

            }
        }
        throw new Error("fetchRetry failed")
    };
}

export class CandleStick {
    time; high; low; close;
    next: CandleStick | undefined;
    parent: CandleStick | undefined;
    children: CandleStick[] = [];
    sma; longSMA;
    lastChild = false

    // get date() {
    //     return new Date(this.time)
    // }
}


class Ticker {
    pair: String | undefined;
    stream: String | undefined;
    bestAsk: String | undefined;
    bestBid: String | undefined;
}