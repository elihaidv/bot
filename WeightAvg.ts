import { BasePlacer } from "./BasePlacer"
import { Bot, Order } from "./Models";

const logger = require('log4js').getLogger("weightAvg");


export class WeightAvg extends BasePlacer{
    myLastBuyAvg;
    myLastBuyCount = 0;

    async place() {

        logger.info("1. ", !this.binance );
        logger.info("2. ", !this.balance[this.SECOND] );
        logger.info("3. ", !this.orders.length );
        logger.info("4. ", !this.sockets.prices[this.PAIR] );
        logger.info("5. ", !this.sockets.orderBooks[this.PAIR] );

        if (!this.binance || !this.balance[this.SECOND] || !this.orders.length || !this.sockets.prices[this.PAIR] || !this.sockets.orderBooks[this.PAIR]) return

        logger.info("1.");

        this.parseAllValues()
    
        logger.info("2.");

        await this.buyBNB()

        logger.info("3.");

        this.calculateLastBuy()

        logger.info("4.");

        await this.placeBuy()

        this.myLastBuy && await this.placeSell()
    }

    async placeBuy() {
        let hoursPast = 0, buyPrice, buyQu, maxBuyPrice = Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0] as unknown as number

        buyPrice = maxBuyPrice * (1 - this.bot.buy_percent)
        
        if (this.myLastBuy){
            hoursPast  = this.bot.closer ? Math.ceil(((new Date().getTime() - this.myLastBuy.time) / 3600000) / 3 ) : 1

            if (hoursPast < 8) {
                buyPrice = Math.min(this.myLastBuy.price * ((1 - this.bot.last_distance) ** (this.myLastBuyCount / hoursPast)) , buyPrice)
            }
        } 

        buyPrice = Math.min(buyPrice, this.sockets.averagePrice(this.PAIR, this.bot.SMA ))


        if (this.myLastBuy && hoursPast < 8){
            buyQu = Math.min(this.balance[this.SECOND].available  / buyPrice,
                             this.myLastBuy.origQty * (1 + this.bot.increase_factor / hoursPast))
        } else {
            buyQu = this.balance[this.SECOND].available * this.bot.amount_percent / buyPrice

        }


        await this.place_order(this.SECOND, buyQu, buyPrice, true)
    }

    async placeSell() {

        let sellPrice = this.myLastBuyAvg * (1 + this.bot.take_profit)

        let sellQu = this.balance[this.FIRST].available

        // let minSell = parseFloat(Object.keys(sockets.orderBooks[this.PAIR].asks)[0])
        // if (this.myLastBuyAvg * (1 - this.bot.stop_loose) > minSell) {
        //     sellPrice = minSell; 
        // }

        await this.place_order(this.FIRST, sellQu, sellPrice, false)

        // this.bot.lastOrder = Bot.STABLE
    }
    
    
    async buyBNB() {
        if (this.bot.minbnb && this.balance["BNB"].available < this.bot.minbnb && !this.PAIR.includes('BNB')) {
            try {
                const bnbPair = this.exchangeInfo.symbols?.
                    find(s => s.symbol == 'BNB' + this.SECOND) ? 'BNB' + this.SECOND : this.FIRST + 'BNB'

                await this.binance.marketBuy(bnbPair, this.bot.bnbamount)
            } catch (e) {
                // console.log(e)
                logger.error(e);
            }
        }
    }
    
    getAction(type: boolean):Function {
        return type ? this.binance!.buy : this.binance!.sell
    }
    
   
}