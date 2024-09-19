import { FutureTrader } from './FuturesTrader.js';
import { Bot, BotStatus } from '../Models.js';

export class DirectionTrader extends FutureTrader {



    async place() {

        if (!this.binance || !this.balance[this.SECOND] || !this.futureSockets.prices[this.PAIR] || !this.orders || !this.orders.length) return
        // await this.binance.futuresLeverage( this.PAIR, this.bot.leverage )
        // await this.binance.futuresMarginType( this.PAIR, 'ISOLATED' )


        this.parseAllValues()

        this.calculatePrice()

        this.buildHistory()


        if (!this.positionAmount) {

            this.setDirection(false)

            await this.placeBuy()

            this.setDirection(true)

            await this.placeBuy()
        } else {
           this.setDirection(this.positionDirection)

            await this.placeSell()
        }

        if (!this.error) {
            this.bot.botStatus = BotStatus.STABLE
        }
    }

    


    async placeBuy() {
        let buyPrice, buyQu
        
                const markPrice = this.futureSockets.markPrices[this.PAIR]
        let balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;

        

        if (this.myLastOrder){
            buyPrice = this.myLastOrder.orderPrice() * this.add(1, this.bot.last_distance)
        } else {
            buyPrice = markPrice * this.add(1, this.bot.buy_percent)
        }
        buyQu = balanceLeveraged * this.bot.amount_percent

        await this.place_order(this.SECOND, Math.abs(buyQu), 0, !this.bot.direction, {
            type: "STOP_MARKET",
            stopPrice: this.roundPrice(this.maxFunc(buyPrice, markPrice)),
        })
    }

    async placeSell() {
                const markPrice = this.futureSockets.markPrices[this.PAIR]

        let price = this.positionEntry * this.add(1,  this.bot.callbackRate / 100)

        await this.place_order(this.PAIR, this.positionAmount * 2, 0, !!this.bot.direction, {
            type: "TRAILING_STOP_MARKET",
            activationPrice: this.roundPrice(this.maxFunc(price, markPrice)),
            callbackRate: this.bot.callbackRate
        })

        price = this.positionEntry * this.add(1,  this.bot.take_profit)

        await this.place_order(this.PAIR, this.positionAmount * 2,0, !!this.bot.direction, {
            type: "STOP_MARKET",
            stopPrice: this.roundPrice(price)
        })

        if (this.error) { 
            price = this.positionEntry * this.sub(1, this.bot.stop_loose)
            await this.place_order(this.PAIR, 0, 0, !!this.bot.direction, {
                type: "STOP_MARKET",
                stopPrice: this.roundPrice(this.minFunc(price, markPrice)),
                closePosition: true
            })
        }


    }



}