import { BaseSockets } from "./BaseSockets.js";
import { Account, Bot, Key, Order } from "../Models.js";
import { BotLogger } from "../Logger.js";

export class SocketsFutures extends BaseSockets {
    
    markPrices : {[pair:string]:number} = {}

    private static finstance: SocketsFutures;
    public static getFInstance(): SocketsFutures {
        if (!SocketsFutures.finstance) {
            SocketsFutures.finstance = new SocketsFutures();
        }
        return SocketsFutures.finstance;
    }

    account_update = (account:Account) => (data) => {

        if (data.eventType == "ACCOUNT_UPDATE") {

            for (let obj of data.updateData.balances) {
                account.balance[obj.asset] = obj.walletBalance
            }

            for (let obj of data.updateData.positions) {
                account.positions[obj.symbol + obj.positionSide] = obj
            }

        } else if (data.eventType == "ORDER_TRADE_UPDATE") {

            const orderUpdate = data.order;

            // console.log(orderUpdate)

            account.orders[orderUpdate.symbol] ||= []

            let order = account.orders[orderUpdate.symbol].find(o => o.orderId.toString() == orderUpdate.orderId.toString()) as Order

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
                account.orders[orderUpdate.symbol].push(newOrder)
            }

            if (orderUpdate.orderStatus == 'FILLED' ||
                (orderUpdate.orderStatus == 'EXPIRED' && orderUpdate.orderType == "LIMIT" && orderUpdate.originalOrderType != "TAKE_PROFIT")) {
                if (!orderUpdate.clientOrderId.includes("BigPosition")) {
                    account.changed.push(orderUpdate.symbol + orderUpdate.positionSide);
                    BotLogger.instance.log({
                        type: "OrderFilled - Futures",
                        orderUpdate
                    })
                }
                if (orderUpdate.clientOrderId.includes("LAST")) {
                    account.needTransfer.push(orderUpdate.symbol)
                }
            }

            if (orderUpdate.orderStatus == 'EXPIRED') {
                console.log('EXPIRED:', orderUpdate.symbol, orderUpdate.side, orderUpdate.originalPrice, orderUpdate.orderTradeTime)
                BotLogger.instance.log({
                    type: 'OrderExpiered',
                    orderUpdate
                })
            }
        }

    }

    addUserDataSockets(acc: Account) {
        acc.binance.futuresAccount().then(data => {

            data.assets && data.assets.forEach(a => {
                acc.balance[a.asset] = a.walletBalance
            });

            data.positions && data.positions.filter(p => p.updateTime).forEach(p => {
                acc.positions[p.symbol + p.positionSide] = p
            });
        });

        try {

            acc.binance.websockets.userFutureData(
                console.log,
                this.account_update(acc),
                this.account_update(acc),
                s => acc.socket = s,
                console.log,
                console.error)
        } catch (e) {
            console.error("Socket error")
            console.error(e)
        }
    }

    async updateBookTickerStream() {
        for (const p of this.pairs) {
        if (!this.markPrices[p])
            this.binance.futuresMarkPriceStream(p, data => {
                this.markPrices[p] = parseFloat(data.markPrice)
            })
        }
    }

    fetchOrdersBySymbol = async (acc: Account, PAIR: string) => {
        if (acc.orders[PAIR] === undefined) {
            acc.orders[PAIR] = []

            const openOrders = await acc.binance.futuresAllOrders(PAIR, { limit: 1000 })

            if (openOrders.code) throw openOrders.msg

            acc.orders[PAIR] = acc.orders[PAIR].concat(openOrders.filter(o => o.status != "CANCELED").map(order => {
                const o = Object.assign(new Order(), order)
                o.price ||= order.avgPrice
                return o
            }
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
    }
    async fetchInitOrders(bots: Array<Bot>) {
        for (let bot of bots) {

            const PAIR = bot.coin1 + bot.coin2
            const acc = this.accounts[bot.key_id] as Account
            try {

                await this.fetchOrdersBySymbol(acc, PAIR)

                if (bot.signalings) {
                    for (const s of bot.signalings) {
                        await this.fetchOrdersBySymbol(acc, s.coin1 + s.coin2)
                    }
                }
            } catch (e) {
                acc.orders[PAIR] = undefined
                console.error("FetchInit Error: ", e, " Bot Id: ", bot.id())
                BotLogger.instance.error({
                    type: "FetchInitError - Futures",
                    botId: bot.id(),
                    error: e,
                    pair: PAIR
                })

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
