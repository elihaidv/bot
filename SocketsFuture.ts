import { BaseSockets } from "./BaseSockets";
import { Account, Bot, Key, Order } from "./Models";

export class SocketsFutures extends BaseSockets {
    futuresBookTickerStreams = new Array<Ticker>();

    private static finstance: SocketsFutures;
    public static getFInstance(): SocketsFutures {
        if (!SocketsFutures.finstance) {
            SocketsFutures.finstance = new SocketsFutures();
        }
        return SocketsFutures.finstance;
    }

    account_update = (balance, positions, orders) => (data) => {

        if (data.eventType == "ACCOUNT_UPDATE") {

            for (let obj of data.updateData.balances) {
                balance[obj.asset] = obj.walletBalance
            }

            for (let obj of data.updateData.positions) {
                positions[obj.symbol + obj.positionSide] = obj
            }

        } else if (data.eventType == "ORDER_TRADE_UPDATE") {

            const orderUpdate = data.order;

            // console.log(orderUpdate)

            orders[orderUpdate.symbol] ||= []

            let order = orders[orderUpdate.symbol].find(o => o.orderId.toString() == orderUpdate.orderId.toString()) as Order

            let newOrder = new Order(
                orderUpdate.side,
                orderUpdate.orderStatus,
                orderUpdate.originalPrice,
                orderUpdate.orderId,
                orderUpdate.originalQuantity,
                orderUpdate.originalQuantity,
                orderUpdate.orderTradeTime,
                orderUpdate.orderType,
                orderUpdate.clientOrderId,
                orderUpdate.positionSide,
                orderUpdate.averagePrice
            );


            if (order) {
                newOrder.pnl = order.pnl + parseFloat(orderUpdate.realizedProfit)
                Object.assign(order, newOrder)

            } else {
                newOrder.pnl = parseFloat(orderUpdate.realizedProfit)
                orders[orderUpdate.symbol].push(newOrder)
            }

            if (orderUpdate.orderStatus == 'FILLED' || 
               (orderUpdate.orderStatus == 'EXPIRED' && orderUpdate.orderType == "LIMIT")) {
                if (!orderUpdate.clientOrderId.includes("BigPosition")){   
                    orders.changed.push(orderUpdate.symbol + orderUpdate.positionSide);
                }
            }

            if (orderUpdate.orderStatus == 'EXPIRED') {
                console.log('EXPIRED:', orderUpdate.symbol, orderUpdate.side, orderUpdate.originalPrice, orderUpdate.orderTradeTime)
            }
        }

    }

    addUserDataSockets(acc: Account) {
        acc.binance.futuresAccount().then(data => {

            data.assets && data.assets.forEach(a => {
                acc.balance[a.asset] = a.walletBalance
            });

            data.positions && data.positions.filter(p => p.updateTime).forEach(p => {
                acc.positions[p.symbol+p.positionSide] = p
            });
        });


        acc.binance.websockets.userFutureData(
            console.log,
            this.account_update(acc.balance, acc.positions, acc.orders),
            this.account_update(acc.balance, acc.positions, acc.orders),
            s => acc.socket = s)
    }

    async updateBookTickerStream() {

        this.futuresBookTickerStreams.forEach(t => this.binance.websockets.terminate(t.pair));
        this.futuresBookTickerStreams = []

        for (const p of this.pairs) {
            const ticker = new Ticker();
            ticker.pair = p
            ticker.stream = this.binance.futuresBookTickerStream(p, ({ bestAsk, bestBid }) => {
                ticker.bestAsk = bestAsk
                ticker.bestBid = bestBid
            })
            this.futuresBookTickerStreams.push(ticker)
            await this.timeout(500);
        }
    }

    ticker(pair): Ticker | undefined {
        return this.futuresBookTickerStreams.find(t => t.pair == pair)
    }

    async fetchInitOrders(bots: Array<Bot>) {
        for (let bot of bots) {

            const PAIR = bot.coin1 + bot.coin2
            const acc = this.accounts[bot.key_id] as Account
            try {
                if (acc.orders[PAIR] === undefined) {
                    acc.orders[PAIR] = []

                    const openOrders = await acc.binance.futuresAllOrders(PAIR,{limit:1000})

                    if (openOrders.code) throw openOrders.msg

                    acc.orders[PAIR] = acc.orders[PAIR].concat(openOrders.filter(o => o.status != "CANCELED").map(order =>
                        Object.assign(new Order(), order)
                    ));

                    acc.orders[PAIR].push(new Order())

                    const trades = await acc.binance.futuresUserTrades(PAIR)

                    if (trades.code) throw trades.msg

                    trades.forEach(t => {
                        const o = acc.orders[PAIR].find(o => o.orderId.toString() == t.orderId.toString())
                        if (o)
                            o.pnl += parseFloat(t.realizedPnl)
                    });

                    // acc.orders[PAIR] = acc.orders[PAIR].concat(trades.map(t => new Order(
                    //     t.side,
                    //     "FILLED",
                    //     t.price,
                    //     t.orderId,
                    //     t.qty,
                    //     t.qty,
                    //     t.time,
                    //     'LIMIT',
                    //     t.clientOrderId.includes("FIRST")
                    // )))

                    await this.timeout(500)
                }
            } catch (e) {
                acc.orders[PAIR] = undefined
                console.log("FetchInit Error: ", e, " Bot Id: ", bot.id())
            }

        }


    }

    public async updateSockets(bots: Array<Bot>, keys: Array<Key>) {
        if (this.isPairsChanged(bots)) {
            await this.updateBookTickerStream()
            this.updatePricesSockets()
        }
        await this.updateBalancesSockets(bots, keys)
        await this.fetchInitOrders(bots)
    }



}

class Ticker {
    pair: String | undefined;
    stream: String | undefined;
    bestAsk: String | undefined;
    bestBid: String | undefined;
}