import { BaseSockets } from "./BaseSockets.js";
import { Account, Bot, Key, Order } from "../Models.js";
import { BotLogger } from "../Logger.js";


export class Sockets extends BaseSockets {

    private static instance: Sockets;
    public static getInstance(): Sockets {
        if (!Sockets.instance) {
            Sockets.instance = new Sockets();
        }

        return Sockets.instance;
    }

    compare = (arr1, arr2) =>
        !arr1.filter(i => arr2.indexOf(i) == -1).length && !arr2.filter(i => arr1.indexOf(i) == -1).length


    averagePrice = (pair, steps) => this.prices[pair].slice(0, steps).reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / steps;

    balance_update = (key, orders) => (data) => {
        if (data.e == "outboundAccountPosition") {
            for (let obj of data.B) {
                key[obj.a] = {
                    available: obj.f,
                    onOrder: obj.l,
                    total: parseFloat(obj.f) + parseFloat(obj.l)
                }
            }
        } else if (data.e == "executionReport") {
            if (!orders[data.s]) orders[data.s] = []
            let order = orders[data.s].find(o => o.orderId == data.i) as Order

            let newOrder = new Order(
                data.S,
                data.X,
                data.p,
                data.i,
                data.q,
                data.z,
                data.E,
                data.o,
                data.c
            );

            if (order) {
                Object.assign(order, newOrder)
            } else {
                orders[data.s].push(newOrder)
            }

            if (data.x == 'TRADE') {
                orders.changed.push(data.s);
                console.log(data.S, data.s)

                BotLogger.instance.log({
                    type: "OrderFilled - Spot",
                    order
                })
            }
        }
    }

    execution_update = (orders) => (data) => {
        console.log(data)

        BotLogger.instance.log({
            type: "TradeEvent1",
            message: JSON.stringify(data)
        })
        if (!orders[data.s]) orders[data.s] = []
        let order = orders[data.s].find(o => o.orderId == data.i) as Order

        let newOrder = new Order(
            data.S,
            data.X,
            data.p,
            data.i,
            data.q,
            data.z,
            data.E,
            data.o
        );

        if (order) {
            Object.assign(order, newOrder)
        } else {
            orders[data.s].push(newOrder)
        }

        if (newOrder.status == 'FILLED') {
            orders.changed.push(data.s);
            // console.log(data.S, data.s)
        }

    }

    updateDepthSockets() {

        if (this.depthCacheSocket) this.binance.websockets.terminate(this.depthCacheSocket);

        this.depthCacheSocket = this.binance.websockets.depthCache(this.pairs.filter(x=>x), (symbol, depth) => {
            if (!this.orderBooks[symbol]) this.orderBooks[symbol] = {}

            this.orderBooks[symbol].bids = this.binance.sortBids(depth.bids);
            this.orderBooks[symbol].asks = this.binance.sortAsks(depth.asks);
        });
    }



    addUserDataSockets(acc: Account) {
        acc.binance.balance((error, balances) => {
            if (error) {
                console.log('Balance error' + error.body)
                BotLogger.instance.error({
                    type: "BalanceError - Spot",
                    account: acc,
                    error
                })
            } 
            for (let b in balances) {
                balances[b].total = parseFloat(balances[b].available) + parseFloat(balances[b].onOrder)
            }
            Object.assign(acc.balance, balances)
        });



        try {
            acc.socket = acc.binance.websockets.userData(
                this.balance_update(acc.balance, acc.orders),
                this.execution_update(acc.orders))
        } catch (e: any) {
            console.error("UserSokcet", e.message)
            BotLogger.instance.error({
                type: "UserSokcetError - Spot",
                account: acc,
                e
            })
        }
    }


    fetchInitOrders(bots: Array<Bot>) {
        for (let bot of bots) {
            const PAIR = bot.coin1 + bot.coin2
            const acc = this.accounts[bot.key_id]

            if (acc.orders[PAIR] === undefined) {
                acc.orders[PAIR] = []

                acc.binance.openOrders(PAIR, (error, trades, symbol) => {
                    if (trades.map)
                        acc.orders[PAIR] = acc.orders[PAIR].concat(trades.map(t => Object.assign(new Order(), t)))
                });
                acc.binance.allOrders(PAIR, (error, trades, symbol) => {
                    if (trades.map) {
                        const orders:Array<Order> = trades.map(t => new Order(
                            t.side,
                            t.status,
                            t.price,
                            t.orderId,
                            parseFloat(t.origQty),
                            parseFloat(t.executedQty),
                            t.time,
                            t.type,
                            t.clientOrderId
                        ))

                        let firstOrder;

                        for (let o of orders) {
                            if (!firstOrder){
                                firstOrder = o

                            } else if (firstOrder.orderId != o.orderId){
                                acc.orders[PAIR].push(firstOrder)
                                firstOrder = o

                            } else {
                                firstOrder.origQty += o.origQty
                            }
                        }
                        firstOrder && acc.orders[PAIR].push(firstOrder)
                    }
                },{limit:1000});
            }
        }


    }

    public async updateSockets(bots: Array<Bot>, keys: Array<Key>) {
        if (this.isPairsChanged(bots)) {
            await this.updateDepthSockets()
            this.updatePricesSockets()
        }
        await this.updateBalancesSockets(bots, keys)
        await this.fetchInitOrders(bots)
    }

}