import { dbo } from './Main'
import { Bot, Order } from './Models'
import { Sockets } from './Sockets'

const logger = require('log4js').getLogger("basePlacer");


export abstract class BasePlacer {
    myLastBuy: Order | undefined
    myLastSell: any
    filters: any
    exchangeInfo: any
    FIRST: string
    SECOND: string
    PAIR: string

    binance: any
    balance: Map<String, any>
    orders: Array<Order>

    distanceTimestamp: number = 0
    myLastBuyPrice: number = 0



    myLastBuyAvg;
    myLastBuyCount = 0;

    sockets = Sockets.getInstance()


    bot: Bot


    error = false;

    constructor(_bot: Bot, _exchangeInfo) {
        this.FIRST = _bot.coin1
        this.SECOND = _bot.coin2
        this.PAIR = _bot.coin1 + _bot.coin2

        this.binance = _bot.binance?.binance
        this.balance = _bot.binance?.balance
        this.orders = _bot.binance?.orders[this.PAIR]


        this.exchangeInfo = _exchangeInfo.symbols.find(s => s.symbol == this.PAIR)
        this.filters = this.exchangeInfo.filters.reduce((a, b) => { a[b.filterType] = b; return a }, {})

        this.bot = _bot

    }

    async buyBNB() {
        if (this.bot.minbnb && this.balance.get("BNB").available < this.bot.minbnb && !this.PAIR.includes('BNB')) {
            try {
                const bnbPair = this.exchangeInfo.symbols
                    .find(s => s.symbol == 'BNB' + this.SECOND) ? 'BNB' + this.SECOND : this.FIRST + 'BNB'

                await this.binance!.marketBuy(bnbPair, this.bot.bnbamount)
            } catch (e) {
                // console.log(e)
                logger.error(e);
            }
        }
    }

    align(price, direction, qu) {
        let tick = parseFloat(this.filters.PRICE_FILTER.tickSize) || this.bot.tickSize

        const book = this.sockets.orderBooks[this.PAIR][direction ? "bids" : "asks"]
        for (let orderPrice in book) {
            if (direction && price > orderPrice && qu < (book[orderPrice] * 2)) {
                return parseFloat(orderPrice) + tick
            }

            if (!direction && price < orderPrice && qu < (book[orderPrice] * 2)) {
                return parseFloat(orderPrice) - tick
            }
        }

        logger.info("price = ", price);
        return price
    }

    buySide = () => this.bot.direction ? "SELL" : "BUY";

    sellSide = () => this.bot.direction ? "BUY" : "SELL";

    calculateLastBuy() {
        const buys = Array<Order>()
        for (let trade of this.orders
            .filter(x => x.status.includes('FILLED'))
            .filter(x => x.positionSide == this.bot.positionSide())
            .reverse()) {

            if (trade.isBigPosition()) {
                break
            }

            if (trade.side == this.buySide()) {
                buys.push(trade)
                this.myLastBuyCount++

            } else {
                this.myLastSell = trade
                break;
            }
        }

        this.myLastBuy = buys[0]
        this.myLastBuyAvg = this.weightAverage(buys)

    }

    weightAverage(arr) {
        const overallQu = arr.reduce((a, b) => a + parseFloat(b.executedQty), 0.0)
        return arr.reduce((a, b) => a + (parseFloat(b.price) * (b.executedQty / overallQu)), 0.0)
    }

    roundQu = (qu) => this.truncDigits(qu, this.countDecimals(parseFloat(this.filters.LOT_SIZE.stepSize)))
    roundPrice = (price) => this.truncDigits(price, this.countDecimals(parseFloat(this.filters.PRICE_FILTER.tickSize)))

    abstract getAction(type: boolean): Function

    async place_order(coin, qu, price, type: boolean, params?) {
        let minNotional = this.filters.MIN_NOTIONAL.minNotional || this.bot.minNotional


        if (coin == "BNB") {
            qu -= this.bot.minbnb
        }

        const action: Function = this.getAction(type)

        if (this.bot.align) {
            price = this.align(price, type, qu)
        }

        qu = this.roundQu(qu)
        price = this.roundPrice(price)

        if ((qu * price) < minNotional) return

        this.bot.lastOrder = new Date().getTime()

        
        params ||= {}
        params.positionSide = this.bot.positionSide()

        try {

            let res = await action(this.PAIR, qu, price, params)
            if (res.msg) {
                // console.log(res.msg, this.PAIR, price, qu, this.bot.id())
                logger.info(res.msg, this.PAIR, price, qu, this.bot.id())


                dbo.insertOne( {
                    bot_id: this.bot.id,
                    type: type,
                    coin: this.PAIR,
                    amount: qu,
                    price: price,
                    message: res.msg
                })

                this.error = true
                return res
            } else {

                // console.log(res.symbol, res.side, res.price, res.origQty, res.status)
                logger.info(res.symbol, res.side, res.price, res.origQty, res.status)
                if (res.status == "EXPIRED") {
                    return res.status
                }
            }
            //     order = new Order()
            //     order.type = type
            //     order.coin = this.PAIR
            //     order.price = price
            //     order.amount = qu
            //     order.this.bot_id = this.bot.id
            //     order.save()
        } catch (e: any) {
            logger.error(e);

            // console.log(e.body || e, this.PAIR, price, qu, this.bot.id())
            logger.info(e.body || e, this.PAIR, price, qu, this.bot.id())
            this.error = true
                

            
            dbo.insertOne( {
                bot_id: this.bot.id,
                type: type,
                coin: this.PAIR,
                amount: qu,
                price: price,
                message: e.getMessage()
            })
            return e
        } finally {

        }
    }

    parseAllValues() {
        for (let k in this.bot) {
            if (parseFloat(this.bot[k]) == this.bot[k]) {
                this.bot[k] = parseFloat(this.bot[k])
            }

        }
    }

    truncDigits = function (number: number, digits: number) {
        const fact = 10 ** digits;
        return Math.floor(number * fact) / fact;
    }

    countDecimals = function (number: number): number {
        if (Math.floor(number) === number) {
            return 0;
        }
        if (number.toString().includes("-")) {
            return parseInt(number.toString().split("-")[1]);
        }
        if (!number.toString().includes(".")) return 0;
        return number.toString().split(".")[1].length || 0;
    }
}

