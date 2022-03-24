
import { throws } from 'assert';
import { BasePlacer } from './BasePlacer'
import { DualBot } from './DualBot';
import { Account, Bot, Key, Order } from './Models';
import { SocketsFutures } from './SocketsFuture';

export class FutureTrader extends BasePlacer {

    positionAmount = 0;
    positionEntry = 0;

    getAction(type: boolean): Function {
        return type ? this.binance!.futuresBuy : this.binance!.futuresSell
    }

    futureSockets = SocketsFutures.getFInstance()

    minFunc;
    maxFunc;

    async place() {

        if (!this.binance || !this.balance[this.SECOND] || !this.futureSockets.prices[this.PAIR] || !this.orders || !this.orders.length) return
        // await this.binance.futuresLeverage( this.PAIR, this.bot.leverage )
        // await this.binance.futuresMarginType( this.PAIR, 'ISOLATED' )

        this.minFunc = this.bot.direction ? Math.max : Math.min
        this.maxFunc = this.bot.direction ? Math.min : Math.max

        this.parseAllValues()

        this.calculatePrice()

        this.calculateLastBuy()

        await this.placeBuy()

        this.positionAmount != 0 && await this.placeSell()
    }
    calculatePrice() {

        if (!this.isEmptyObject(this.bot.binance?.positions)) {
            const pos = this.bot.binance?.positions[this.PAIR + this.bot.positionSide()]
            if (pos) {
                this.positionAmount = Math.abs(pos.positionAmt ||
                    pos.positionAmount)

                this.positionEntry = pos.entryPrice ||
                    pos.positionEntry

            }
        }

    }

    add(operand1, operand2) {
        return this.bot.direction ?
            operand1 - operand2 :
            operand1 + operand2
    }

    sub(operand1, operand2) {
        return this.bot.direction ?
            operand1 + operand2 :
            operand1 - operand2

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

        if ( this.isFirst()) {
            params.newClientOrderId = "FIRST" + this.PAIR
        }

        if (this.myLastBuy) {
            // const positionRatio = (this.positionAmount * maxBuyPrice) / balanceLeveraged;
            // buyPrice = this.myLastBuy.price * this.sub(1, positionRatio / this.bot.far_speed)
            buyPrice = this.myLastBuy.price * this.sub(1, this.bot.last_distance)
        } else {
            buyPrice = maxBuyPrice * this.sub(1, this.bot.buy_percent)

            if (this.positionAmount && this.myLastSell) {
                buyPrice = this.minFunc(this.myLastSell.price * this.sub(1, this.bot.take_profit), buyPrice)
            }
        }

        buyPrice = this.minFunc(buyPrice, this.futureSockets.averagePrice(this.PAIR, this.bot.SMA), maxBuyPrice)

        balanceLeveraged -= this.positionAmount * this.positionEntry

        if (this.myLastBuy && this.myLastBuy.isFirst()) {
            buyQu = (this.myLastBuy.executedQty * (1 + this.bot.increase_factor)) / this.bot.increase_first
        } else if (this.myLastBuy) {
            buyQu = this.myLastBuy.executedQty * (1 + this.bot.increase_factor)

        } else if (this.buyLastSell()) {
            buyQu = this.myLastSell.executedQty

        } else {
            buyQu = balanceLeveraged * this.bot.amount_percent * this.bot.increase_first / buyPrice
            this.error = true
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

    buyLastSell() {
        return this.positionAmount && this.myLastSell
    }

    addPNLToPrice(price, amount) {
        let pnl = 0.0
        for (let order of this.orders
            .filter(x => x?.status.includes('FILLED'))
            .filter(x => x.positionSide == this.bot.positionSide())
            .reverse()) {

            pnl += order.pnl

            if (order.isFirst()) {
                break
            }
        }

        if (pnl >= 0) {
            return price
        }

        return this.add(price, (Math.abs(pnl) / amount))
    }

    findStandbyBuy() {
        let sellOrders: Array<string> = []

        for (let order of this.orders
            .filter(x => x?.status.includes('FILLED'))
            .filter(x => x.positionSide == this.bot.positionSide())
            .reverse()) {
                
            if (order.isFirst()) {
                break
            }

            if (order.side == this.sellSide()) {
                sellOrders.push(order.clientOrderId);

            } else if (!sellOrders.includes("SELL" + order.orderId)) {
                return order
            }        
        }
    }

    async placeSell() {

        // if (this.bot.stop_loose) {
        //     if (this.positionEntry * this.sub(1, this.bot.stop_loose) > maxBuyPrice) {
        //         await this.place_order(this.PAIR, this.positionAmount, maxBuyPrice, this.bot.direction)
        //         return
        //     }
        // }
        let maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number

        let price, amount = this.positionAmount

        const lastStandbyBuy = this.findStandbyBuy()
        

        if (lastStandbyBuy){
            price = this.positionEntry * this.add(1, this.bot.take_profit_position || this.bot.take_profit)
        } else {
            price = this.positionEntry * this.add(1, this.bot.take_profit)
        }
        

        price = this.addPNLToPrice(price, amount)

        if (this.myLastBuy) {
            if (this.myLastBuy.executedQty < this.positionAmount) {
                amount = await this.placeSellFromBuy(this.myLastBuy, price)
            }
        } else {
            
            if (lastStandbyBuy && this.bot.sellAdded) {
                amount = await this.placeSellFromBuy(lastStandbyBuy, price)
            }
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

        if (!this.error) {
            this.bot.lastOrder = Bot.STABLE
        }
    }

    async placeSellFromBuy(order: Order, closePrice) {
        let maxBuyPrice = this.futureSockets.ticker(this.PAIR)?.bestBid as unknown as number

        const price = this.maxFunc(order.price * this.add(1, this.bot.take_profit), maxBuyPrice * 1.001)

        if (this.biggerThan(closePrice, price) && (this instanceof DualBot || !order.isFirst())) {

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