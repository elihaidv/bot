

import { FutureTrader } from './FuturesTrader.js';
import { Account, Bot, BotStatus, Key, Order } from '../Models.js';

export class DualBot extends FutureTrader {
    bigPosition: Order | undefined
  

    async placeBuy() {
                const markPrice = this.futureSockets.markPrices[this.PAIR]
        let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;
        
        if (!this.positionAmount) {
            await this.place_order(this.PAIR, (balanceLeveraged / markPrice) * this.bot.bigPosition, 0, !this.bot.direction, {
                type: "MARKET",
                positionSide: this.bot.positionSide(),
                newClientOrderId: 'BigPosition' + this.bot.positionSide(),
            })
        }
        super.placeBuy()
    }
    
    isFirst(): boolean {
        return !this.myLastOrder || !this.positionAmount
    }

    seekBigPosition(){
        for (let order of this.orders
            .filter(x => x?.status.includes('FILLED'))
            .filter(x => x.positionSide == this.bot.positionSide())
            .reverse()) {
            if (order.isBigPosition()) {
                this.bigPosition = order;
                break
            }
        }


    }

    findStandbyBuy() {
        let sellOrders: Array<string> = []

        for (let order of this.orders
            .filter(x => x?.status.includes('FILLED'))
            .filter(x => x.positionSide == this.bot.positionSide())
            .reverse()) {
                
            if (order.isBigPosition()) {
                break
            }

            if (order.side == this.sellSide()) {
                sellOrders.push(order.clientOrderId);

            } else if (!sellOrders.includes("SELL" + order.orderId)) {
                return order
            }        
        }
    }

    buyLastSell():boolean {
        return !!this.findStandbyBuy()

    }

    async placeSell() {

                const markPrice = this.futureSockets.markPrices[this.PAIR]

        this.seekBigPosition()
        
        let price = this.bigPosition!.avgPrice * this.add(1, this.bot.take_profit_position)

        const lastStandbyBuy = this.findStandbyBuy()

        if (this.myLastOrder) {
            if (this.myLastOrder.executedQty < this.positionAmount) {
                await this.placeSellFromBuy(this.myLastOrder, price)
            }
        } else {
            
            if (lastStandbyBuy && this.bot.sellAdded) {
                await this.placeSellFromBuy(lastStandbyBuy, price)
            }
        }
        
        await this.place_order(this.PAIR, 0, 0, this.bot.direction, {
            type: "TAKE_PROFIT_MARKET",
            stopPrice: this.roundPrice(this.maxFunc(price, markPrice)),
            closePosition: true,
            positionSide: this.bot.direction ? 'SHORT': 'LONG'
        })

        price = this.bigPosition!.avgPrice * this.sub(1, this.bot.take_profit_position)

        await this.place_order(this.PAIR, 0, 0, this.bot.direction, {
            type: "STOP_MARKET",
            stopPrice: this.roundPrice(this.minFunc(price, markPrice)),
            closePosition: true,
            positionSide: this.bot.direction ? 'SHORT': 'LONG'
        })


        if (!this.error) {
            this.bot.status = BotStatus.STABLE
        }
    }

}