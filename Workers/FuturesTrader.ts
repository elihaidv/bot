
import { BasePlacer } from './BasePlacer.js'
import { Account, Bot, BotStatus, Key, Order } from '../Models.js';
import { SocketsFutures } from '../Sockets/SocketsFuture.js';
import { BotLogger } from '../Logger.js';
import { Severity } from 'coralogix-logger';

export class FutureTrader extends BasePlacer {

    positionAmount = 0;
    positionEntry = 0;
    positionDirection;

    getAction(type: boolean): Function {
        return type ? this.binance!.futuresBuy : this.binance!.futuresSell
    }

    futureSockets = SocketsFutures.getFInstance()


    async place() {

        this.orders = this.bot.binance?.orders[this.PAIR]
        if (!this.binance || !this.balance[this.SECOND] || !this.futureSockets.prices[this.PAIR] || !this.orders || !this.orders.length || !this.futureSockets.markPrices[this.PAIR]) return
        // await this.binance.futuresLeverage( this.PAIR, this.bot.leverage )
        // await this.binance.futuresMarginType( this.PAIR, 'ISOLATED' )

        const { binance, placer, ...bot } = this.bot
        this.error = false
        BotLogger.instance.log({
            type: "BotStart - Future",
            bot_id: this.bot._id,
            bot,
        }, Severity.info)

        if (!this.isSemulation) {
            this.parseAllValues()
        }

        this.calculatePrice()

        this.calculateDirection()

        this.buildHistory()


        await this.placeBuy()

        this.positionAmount != 0 && await this.placeSell()
    }
    minFunc(...values: number[]) {
        values = values.filter(v => v)
        return this.bot.direction ? Math.max(...values) : Math.min(...values)
    }
    maxFunc(...values: number[]) {
        values = values.filter(v => v)
        return this.bot.direction ? Math.min(...values) : Math.max(...values)
    }
    calculatePrice() {

        if (!this.isEmptyObject(this.bot.binance?.positions)) {
            const pos = this.bot.binance?.positions[this.PAIR + this.bot.positionSide()]
            if (pos) {
                this.positionAmount = Math.abs(pos.positionAmt ||
                    pos.positionAmount)

                this.positionEntry = pos.entryPrice ||
                    pos.positionEntry

                this.positionDirection = (pos.positionAmt ||
                    pos.positionAmount) < 0

            }
        }

    }

    calculateDirection() {


        if (this.bot.direction > 1) {
            this.bot.dynamicDirection = this.bot.direction
        }
        if (this.bot.dynamicDirection) {
            if (!this.positionAmount) {
                const markPrice = this.futureSockets.markPrices[this.PAIR]
                const avgWeekPrice = this.futureSockets.averagePriceQuarter(this.PAIR, this.bot.longSMA)
                this.setDirection(this.bot.dynamicDirection == 2 ? markPrice > avgWeekPrice : markPrice < avgWeekPrice)

            } else {
                this.setDirection(this.positionDirection)
            }
        }
    }

    setDirection(direction) {
        this.bot.direction = direction
        this.minFunc = direction ? Math.max : Math.min
        this.maxFunc = direction ? Math.min : Math.max
    }

    add(operand1, operand2) {
        return this.bot.direction ?
            parseFloat(operand1) - parseFloat(operand2) :
            parseFloat(operand1) + parseFloat(operand2)
    }

    sub(operand1, operand2) {
        return this.bot.direction ?
            parseFloat(operand1) + parseFloat(operand2) :
            parseFloat(operand1) - parseFloat(operand2)

    }

    biggerThan(operand1, operand2) {
        return this.bot.direction ?
            operand1 < operand2 :
            operand1 > operand2

    }

    isFirst() {
        return !this.positionAmount
    }

    fixDirection() {
        if (typeof this.bot.direction == "string") {
            this.bot.direction = isNaN(parseInt(this.bot.direction)) ? this.bot.direction : parseInt(this.bot.direction)
        }
    }

    async placeBuy() {
        this.fixDirection()
        let buyPrice, fbuyPrice, buyQu, fbuyQu
        const markPrice = this.futureSockets.markPrices[this.PAIR]
        let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;
        let params: any = {};

        if (this.isFirst()) {
            params.newClientOrderId = "FIRST" + this.PAIR
            fbuyPrice = markPrice * this.sub(1, this.bot.buy_percent)
        } else if (this.myLastOrder?.side == this.sellSide()) {
            fbuyPrice = this.myLastOrder?.avgPrice * this.sub(1, this.bot.take_profit)
        } else {
            if (this.bot.amount_percent > 0.9) {
                return
            }
            fbuyPrice = this.myLastOrder?.avgPrice * this.sub(1, this.bot.last_distance ?? 0)
        }

        // BotLogger.instance.log({
        //     type: "PriceTable - Future",
        //     bot_id: this.bot._id,
        //     prices: this.futureSockets.prices[this.PAIR]
        // })
        const averagePrice = this.futureSockets.averagePrice(this.PAIR, this.bot.SMA)
        buyPrice = this.minFunc(fbuyPrice, averagePrice, markPrice)

        balanceLeveraged -= this.positionAmount * this.positionEntry

        if (this.isFirst() || !this.myLastOrder) {
            buyQu = balanceLeveraged * this.bot.amount_percent * this.bot.increase_first / buyPrice
            this.error = true
        } else if (this.myLastOrder.side == this.sellSide()) {
            buyQu = this.myLastOrder.executedQty
        } else if (this.myLastOrder.isFirst()) {
            buyQu = this.myLastOrder.executedQty / this.bot.increase_first
        } else {
            fbuyQu = this.myLastOrder.executedQty * (1 + this.bot.increase_factor)
            buyQu = Math.max(fbuyQu, parseFloat(this.myLastOrder.executedQty.toString()) + parseFloat(this.filters.LOT_SIZE.stepSize))
        }

        if (!this.bot.multiassets) {
            if (balanceLeveraged > 0) {
                buyQu = Math.min(balanceLeveraged / buyPrice, buyQu)
            } else {
                buyQu = 0;
            }
        }

        BotLogger.instance.log({
            type: "BeforeBuy - Future",
            bot_id: this.bot._id,
            fbuyPrice, buyPrice, fbuyQu, buyQu,averagePrice,
            markPrice, balance: this.balance[this.SECOND],
            positionAmount: this.positionAmount,
            positionEntry: this.positionEntry,
            params, balanceLeveraged,
            lastOrder: this.myLastOrder,
            direction: this.bot.direction,
            standingBuy: this.standingBuy,
        })
        await this.place_order(this.SECOND, Math.abs(buyQu), buyPrice, !this.bot.direction, params)
    }

    async placeSell() {
        this.fixDirection()
       
        const markPrice = this.futureSockets.markPrices[this.PAIR] * this.add(1, 0.001)
        const SLprice = this.positionEntry * this.sub(1, this.bot.stop_loose)

        let fsellPrice, amount = this.positionAmount

        if (this.standingBuy) {
            fsellPrice = this.positionEntry * this.add(1, this.bot.take_profit_position || this.bot.take_profit)
        } else {
            fsellPrice = this.positionEntry * this.add(1, this.bot.take_profit)
        }

        const price = this.sub(fsellPrice, this.currentPnl / amount)

        BotLogger.instance.log({
            type: "BeforeSell - Future",
            bot_id: this.bot._id,
            currentPnl: this.currentPnl,
            fsellPrice, price, amount,
            SLprice,
            markPrice, balance: this.balance[this.SECOND],
            positionAmount: this.positionAmount,
            positionEntry: this.positionEntry,
            lastOrder: this.myLastOrder,
            direction: this.bot.direction,
            standingBuy: this.standingBuy,
            sellAdded: this.bot.sellAdded,
            dynamicDirection: this.bot.dynamicDirection,
            positionDirection: this.positionDirection,
        })

        if (this.standingBuy && this.bot.sellAdded && this.standingBuy.executedQty < this.positionAmount) {
            amount = await this.placeSellFromBuy(this.standingBuy, price)
        }

        if (this.bot.callbackRate) {
            await this.place_order(this.PAIR, amount, 0, !!this.bot.direction, {
                type: "TRAILING_STOP_MARKET",
                activationPrice: this.roundPrice(this.maxFunc(price, markPrice)),
                callbackRate: this.bot.callbackRate,
                newClientOrderId: "LAST-SL-" + this.PAIR,
            })
        } else {
            await this.place_order(this.PAIR, 0, 0, !!this.bot.direction, {
                type: "TAKE_PROFIT_MARKET",
                stopPrice: this.roundPrice(this.maxFunc(price, markPrice)),
                closePosition: true,
                newClientOrderId: "LAST-TP-" + this.PAIR,
            })
        }


        if (this.bot.stop_loose) {

            if (SLprice > 0) {
                await this.place_order(this.PAIR, 0, 0, !!this.bot.direction, {
                    type: "STOP_MARKET",
                    stopPrice: this.roundPrice(this.minFunc(SLprice, markPrice)),
                    closePosition: true
                })
            }
        }

        if (!this.error) {
            this.bot.botStatus = BotStatus.STABLE
            BotLogger.instance.log({
                type: "BotEnd - Future",
                bot_id: this.bot.id(),
            })
        } else {
            BotLogger.instance.error({
                type: "Bot iteration error - Future",
                bot_id: this.bot.id()
            })
        }
    }

    async placeSellFromBuy(order: Order, closePrice) {
        const markPrice = this.futureSockets.markPrices[this.PAIR]

        const price = this.maxFunc(order.price * this.add(1, this.bot.take_profit), markPrice * 1.001)

        if (this.biggerThan(closePrice, price) && (/*this instanceof DualBot ||*/ !order.isFirst())) {

            BotLogger.instance.log({
                type: "PlaceSellFromBuy - Future",
                bot_id: this.bot._id,
                currentPnl: this.currentPnl,
                order, price, closePrice,
                markPrice, balance: this.balance[this.SECOND],
                positionAmount: this.positionAmount,
                positionEntry: this.positionEntry,
                lastOrder: this.myLastOrder,
                direction: this.bot.direction,
                standingBuy: this.standingBuy,
                sellAdded: this.bot.sellAdded,
            })
    

            await this.place_order(this.PAIR, order.executedQty, price, !!this.bot.direction, {
                newClientOrderId: "SELL" + order.orderId
            })
            return this.positionAmount - order.executedQty
        }
        return this.positionAmount
    }

    isEmptyObject(obj) {
        return !!obj && Object.keys(obj).length === 0 && obj.constructor === Object;
    }
}