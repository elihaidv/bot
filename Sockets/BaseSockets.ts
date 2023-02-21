import { Account, Bot, Key, Order } from "../Models.js";

import Binance from 'node-binance-api';


export abstract class BaseSockets {
    depthCacheSocket
    orderBooks = {}
    pairs = Array<string>()
    chartsSocket
    prices = {}
    pricesQuarter = {}
    accounts = new Map<string, Account>();

    binance = new Binance().options({})



    compare = (arr1, arr2) =>
        !arr1.filter(i => arr2.indexOf(i) == -1).length && !arr2.filter(i => arr1.indexOf(i) == -1).length


    averagePrice = (pair, steps) => this.prices[pair].slice(0, steps).reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / steps;

    averagePriceQuarter = (pair, steps) => this.pricesQuarter[pair].slice(0, steps).reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / steps;

  
    updateDepthSockets() {

        if (this.depthCacheSocket) this.binance.websockets.terminate(this.depthCacheSocket);

        this.depthCacheSocket = this.binance.websockets.depthCache(this.pairs, (symbol, depth) => {
            if (!this.orderBooks[symbol]) this.orderBooks[symbol] = {}

            this.orderBooks[symbol].bids = this.binance.sortBids(depth.bids);
            this.orderBooks[symbol].asks = this.binance.sortAsks(depth.asks);
        });
    }

    updatePricesSockets() {
        if (this.chartsSocket) this.binance.futuresTerminate(this.chartsSocket);

        this.chartsSocket = this.binance.futuresChart(this.pairs, "5m", (symbol, interval, chart) =>
            this.prices[symbol] = Object.values(chart).map(c => (c as any).open).reverse())

        this.chartsSocket = this.binance.futuresChart(this.pairs, "15m", (symbol, interval, chart) =>
            this.pricesQuarter[symbol] = Object.values(chart).map(c => (c as any).open).reverse())
    }

    abstract addUserDataSockets(acc: Account);

    async updateBalancesSockets(bots:Array<Bot>, keys:Array<Key>) {
        const newKeys = bots.map(b => b.key_id) as Array<string>

        for (let k of newKeys) {
            if (!this.accounts[k]) {


                const keyFound = keys.find(kk => kk._id.toString() == k) as Key

                this.accounts[k] = new Account(
                    new Binance().options({
                        APIKEY: keyFound.public,
                        APISECRET: keyFound.secret
                    }))

                const acc = this.accounts[k] as Account
                this.addUserDataSockets(acc)
                await this.timeout(500)
            }
        }

        for (let b of Object.values(bots)) {
            if (!b.binance) {
                b.binance = this.accounts[b.key_id]
            }
        }
    }

  

    isPairsChanged(bots:Array<Bot>) {
        let botsPairs = bots.map((b) => b.coin1 + b.coin2)

        botsPairs = botsPairs.concat(bots
            .map(({signalings}) => signalings || [])
            .map(s => s.map(({coin1, coin2}) => coin1 + coin2))
            .reduce((a, c) => a.concat(c), []))

        botsPairs = Array.from(new Set(botsPairs));

        if (!this.compare(botsPairs, this.pairs)) {
            this.pairs = botsPairs
            return true
        }

    }

    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

   
    abstract updateSockets(bots: Array<Bot>, keys: Array<Key>)
}