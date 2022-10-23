
// import {BasePlacer} from './BasePlacer'
// import { Sockets } from '../Sockets/Sockets';

// export class OrderPlacer extends BasePlacer{
    

//     async place() {

//         if (!this.binance || !this.balance[this.FIRST] || !this.orders || !this.sockets.prices[this.PAIR] || !this.sockets.orderBooks[this.PAIR] ) return

//         if (this.orders) {
//             this.myLastBuy = this.orders.filter(x => x.status?.includes('FILLED') && x.side == "BUY").slice(-1)[0]
//             this.myLastSell = this.orders.filter(x => x.status?.includes('FILLED') && x.side == "SELL").slice(-1)[0]
//         }

//         this.parseAllValues()
    
//         const calculations = this.calculatePrice()
    
//         this.buyBNB()
    
//         await this.split(this.bot.divide_buy, this.FIRST, calculations.buyPrice, calculations.buyQu, true, this.bot.diffrent_buy)
    
//         await this.split(this.bot.divide_sell, this.SECOND, calculations.sellPrice, calculations.sellQu, false, this.bot.diffrent_sell)
//     }
    
    
//     calculatePrice() {
//         let maxBuyPrice = Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0] as unknown as number
//         let minSellPrice = Object.keys(this.sockets.orderBooks[this.PAIR].asks)[0] as unknown as number

//         let buyPrice = this.bot.buy_side == 'sell' ? minSellPrice : maxBuyPrice
//         buyPrice *= (1 - this.bot.buy_percent)

//         let sellPrice = this.bot.sell_side == 'sell' ? minSellPrice : maxBuyPrice
//         sellPrice *= (1 + this.bot.sell_percent)

//         this.distanceTimestamp = new Date().getTime() - (this.bot.last_distance_minutes * 60 * 1000);

//         if (this.myLastBuy) {
//             let myLastBuyPrice = this.myLastBuy.price

//             if (this.myLastBuy.time > this.distanceTimestamp && (!this.myLastSell || this.myLastSell.time < this.myLastBuy.time)) {
//                 buyPrice = Math.min(buyPrice, myLastBuyPrice * (1 - this.bot.last_distance))
//             }

//             if (this.bot.last_buy_dist && this.myLastBuyPrice > 0) {
//                 let last_buy = this.myLastBuyPrice * this.bot.last_buy_dist
//                 sellPrice = Math.min(last_buy, sellPrice)
//             }

//             if (this.bot.stop_loose && this.myLastBuyPrice > 0) {
//                 if (minSellPrice < this.myLastBuyPrice * (1 - this.bot.stop_loose)) {
//                     sellPrice = minSellPrice
//                 }
//             }

//         }
//         if (this.myLastSell) {
//             if (this.myLastSell.time > this.distanceTimestamp && (!this.myLastBuy || this.myLastSell.time > this.myLastBuy.time)) {
//                 sellPrice = Math.max(sellPrice, this.myLastSell.price * (1 + this.bot.last_distance))
//             }
//         }

//         maxBuyPrice = Math.min(maxBuyPrice, this.sockets.averagePrice(this.PAIR, this.bot.SMA))
//         minSellPrice = Math.max(minSellPrice, this.sockets.averagePrice(this.PAIR, this.bot.SMA))

//         let buyQu = this.balance[this.SECOND].total * this.bot.amount_percent / buyPrice
//         let sellQu = this.balance[this.FIRST].total * this.bot.amount_percent_sell

//         return {
//             buyQu,
//             sellQu,
//             sellPrice,
//             buyPrice
//         }
//     }
    
  
    
//     align(price, direction, qu) {
//         let tick = parseFloat(this.filters.PRICE_FILTER.tickSize) || this.bot.tickSize
    
//         const book = this.sockets.orderBooks[this.PAIR][direction ? "bids" : "asks"]
//         for (let orderPrice in book) {
//             if (direction && price > orderPrice && qu < (book[orderPrice] * 2)) {
//                 return parseFloat(orderPrice) + tick
//             }
    
//             if (!direction && price < orderPrice && qu < (book[orderPrice] * 2)) {
//                 return parseFloat(orderPrice) - tick
//             }
//         }
//         return price
//     }
    
//     async split(divide, coin, price, qu, side, differnt) {
    
//         if (this.bot.increase_factor) {
//             const SIDE = side ? 'BUY' : 'SELL';
//             let tradesCount = 0;

//             for (let trade of this.orders.filter(x => 
//                 x.status?.includes('FILLED') && x.time > this.distanceTimestamp).reverse()){

//                 if (trade.side == SIDE){
//                     tradesCount++;
//                 } else {
//                     break;
//                 }
//             }
    
//             qu *= Math.pow(this.bot.increase_factor, tradesCount)
//         }
    
//         qu /= Math.pow(2, divide - 1)
    
//         for (let i = 0; i < divide; i++) {
//             await this.place_order(coin, qu, price, side)
//             price = side ? price * (1 - differnt) : price * (1 + differnt)
//             qu *= 2
//         }
//     }

//     getAction(type: boolean):Function {
//         return type ? this.binance!.buy : this.binance!.sell
//     }
    
// }
