
import { throws } from 'assert';
import { BasePlacer } from './BasePlacer'
import { Account, Bot, Key, Order } from '../Models';
import { SocketsFutures } from '../Sockets/SocketsFuture';

export class FutureTrader extends BasePlacer {

    positionAmount = 0;
    positionEntry = 0;
    positionDirection;

    getAction(type: boolean): Function {
        return type ? this.binance!.futuresBuy : this.binance!.futuresSell
    }

    futureSockets = SocketsFutures.getFInstance()


    async place() {

        if (!this.binance || !this.balance[this.SECOND] || !this.futureSockets.prices[this.PAIR] || !this.orders || !this.orders.length || !this.futureSockets.ticker(this.PAIR)) return
        // await this.binance.futuresLeverage( this.PAIR, this.bot.leverage )
        // await this.binance.futuresMarginType( this.PAIR, 'ISOLATED' )


        this.parseAllValues()

        this.calculatePrice()

        this.calculateDirection()

        this.buildHistory()

        await this.placeBuy()

        this.positionAmount != 0 && await this.placeSell()
    }
    minFunc(...values: number[]) {
        if (this.isSemulation){
            values.pop()
        }
        return this.bot.direction ? Math.max(...values) : Math.min(...values)
    }
    maxFunc(...values: number[]) {
        if (this.isSemulation){
            values.pop()
        }
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
            this.bot.dynamicDirection = true
        }
        if (this.bot.dynamicDirection) {
            if (!this.positionAmount) {
                const maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number
                const avgWeekPrice = this.futureSockets.averagePriceQuarter(this.PAIR)
                this.setDirection(this.bot.direction == 2 ? maxBuyPrice > avgWeekPrice : maxBuyPrice < avgWeekPrice)

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

    async placeBuy() {
        let buyPrice, buyQu, maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number
        let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;
        let params: any = {};

        if (this.isFirst()) {
            params.newClientOrderId = "FIRST" + this.PAIR
            buyPrice = maxBuyPrice * this.sub(1, this.bot.buy_percent)
        } else if (this.myLastOrder?.side == this.sellSide()) {
            buyPrice = this.myLastOrder?.avgPrice * this.sub(1, this.bot.take_profit)
        } else {
            buyPrice = this.myLastOrder?.avgPrice * this.sub(1, this.bot.last_distance)
        }

        buyPrice = this.minFunc(buyPrice, this.futureSockets.averagePrice(this.PAIR, this.bot.SMA), maxBuyPrice)

        balanceLeveraged -= this.positionAmount * this.positionEntry

        if (this.isFirst()) {
            buyQu = balanceLeveraged * this.bot.amount_percent * this.bot.increase_first / buyPrice
            this.error = true
        } else if (this.myLastOrder?.side == this.sellSide()) {
            buyQu = this.myLastOrder?.executedQty
        } else if (this.myLastOrder?.isFirst()) {
            buyQu = this.myLastOrder.executedQty / this.bot.increase_first
        } else {
            buyQu = this.myLastOrder!.executedQty * (1 + this.bot.increase_factor)
            buyQu = Math.max(buyQu, parseFloat(this.myLastOrder!.executedQty.toString()) + parseFloat(this.filters.LOT_SIZE.stepSize))
        }

        if (!this.bot.multiassets) {
            if (balanceLeveraged > 0) {
                buyQu = Math.min(balanceLeveraged / buyPrice, buyQu)
            } else {
                buyQu = 0;
            }
        }
        await this.place_order(this.SECOND, Math.abs(buyQu), buyPrice, !this.bot.direction, params)
    }

    async placeSell() {

        let maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number

        let price, amount = this.positionAmount

        if (this.standingBuy) {
            price = this.positionEntry * this.add(1, this.bot.take_profit_position || this.bot.take_profit)
        } else {
            price = this.positionEntry * this.add(1, this.bot.take_profit)
        }
        console.log("PNL: " + this.currentPnl)
        // price = this.sub(price, this.currentPnl / amount)

        if (this.standingBuy && this.bot.sellAdded && this.standingBuy.executedQty < this.positionAmount) {
            amount = await this.placeSellFromBuy(this.standingBuy, price)
        }

        if (this.bot.callbackRate) {
            await this.place_order(this.PAIR, amount, 0, this.bot.direction, {
                type: "TRAILING_STOP_MARKET",
                activationPrice: this.roundPrice(this.maxFunc(price, maxBuyPrice)),
                callbackRate: this.bot.callbackRate
            })
        } else {
            await this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                type: "TAKE_PROFIT_MARKET",
                stopPrice: this.roundPrice(this.maxFunc(price, maxBuyPrice)),
                closePosition: true
            })
        }


        if (this.bot.stop_loose) {
            const SLprice = this.sub(this.positionEntry, (((this.balance[this.SECOND] * this.bot.stop_loose)/this.positionAmount) * this.positionEntry))
            console.log("SLprice: ", ((this.positionEntry - SLprice) / this.positionEntry) * this.positionAmount) 
            console.log("SLprice-market: ", ((this.positionEntry - maxBuyPrice) / this.positionEntry) * this.positionAmount) 
            if (SLprice > 0) {
                await this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                    type: "STOP_MARKET",
                    stopPrice: this.roundPrice(this.minFunc(SLprice, maxBuyPrice)),
                    closePosition: true
                })
            }
        }

        if (!this.error) {
            this.bot.lastOrder = Bot.STABLE
        }
    }

    async placeSellFromBuy(order: Order, closePrice) {
        let maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number

        const price = this.maxFunc(order.price * this.add(1, this.bot.take_profit), maxBuyPrice * 1.001)

        if (this.biggerThan(closePrice, price) && (/*this instanceof DualBot ||*/ !order.isFirst())) {

            await this.place_order(this.PAIR, order.executedQty, price, this.bot.direction, {
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