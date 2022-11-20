"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CandleStick = exports.DataManager = void 0;
var fs = require("node:fs/promises");
var DALSimulation_1 = require("../DALSimulation");
var Models_1 = require("../Models");
var Sockets_1 = require("../Sockets/Sockets");
var cf = require('node-fetch-cache');
var fetch = cf.fetchBuilder.withCache(new cf.FileSystemCache({
    cacheDirectory: '/tmp/simcache',
}));
var admZip = require('adm-zip');
var Binance = require('node-binance-api');
var DataManager = /** @class */ (function () {
    function DataManager(bot) {
        var _this = this;
        this.chart = [];
        this.charts = {};
        this.openOrders = [];
        this.currentCandle = 0;
        this.profit = 0;
        this.currentHour = 0;
        this.offsetInHour = 0;
        this.UNIT_TIMES = ['1h', '15m', '5m', '1m', '1s'];
        this.MIN_CHART_SIZE = 5 * 24 * 60 * 60;
        this.UNIT_HOUR_CANDLES = {
            '1h': 1,
            '15m': 4,
            '5m': 12,
            '1m': 60,
            '1s': 60 * 60
        };
        this.openOrder = function (type) { return (function (coin, qu, price, params) {
            var p = price || params.stopPrice || params.activationPrice;
            // if (type ? p > this.chart[this.time].high :  p < this.chart[this.time].low) {
            //     return {msg:"Order Expire"}
            // }
            var order = new Models_1.Order(type ? 'BUY' : "SELL", "NEW", p, _this.makeid(10), qu, qu, _this.currentCandle, params.type || "LIMIT", params.newClientOrderId, _this.bot.positionSide(), p);
            order.closePosition = params.closePosition;
            _this.openOrders.push(order);
            DALSimulation_1.DAL.instance.logStep({
                type: 'OpenOrder', side: order.side, price: order.price, quantity: order.origQty, priority: 8,
                high: _this.chart[_this.currentCandle].high,
                low: _this.chart[_this.currentCandle].low,
            });
            return order;
        }); };
        this.candlesticks = function () { return new Promise(function (resolve) { return Binance().candlesticks(_this.PAIR, "1m", function (e, t, s) { return resolve(t); }); }); };
        this.bot = bot;
        this.PAIR = this.bot.coin1 + this.bot.coin2;
        this.sockets = Sockets_1.Sockets.getInstance();
        this.sockets.averagePrice = this.averagePrice.bind(this);
        this.sockets.averagePriceQuarter = this.averagePriceQuarter.bind(this);
    }
    DataManager.prototype.hasMoney = function (t) {
        return true;
        //   throw new Error("Method not implemented.");
    };
    DataManager.prototype.setExchangeInfo = function (_exchangeInfo) {
        var _this = this;
        this.exchangeInfo = _exchangeInfo;
        this.filters = _exchangeInfo.symbols.find(function (s) { return s.symbol == _this.PAIR; }).filters.reduce(function (a, b) { a[b.filterType] = b; return a; }, {});
    };
    DataManager.prototype.makeid = function (length) {
        var result = '';
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for (var i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() *
                charactersLength));
        }
        return result;
    };
    DataManager.prototype.checkFileExists = function (filepath) {
        return __awaiter(this, void 0, void 0, function () {
            var flag, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        flag = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fs.access(filepath)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        flag = false;
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/, flag];
                }
            });
        });
    };
    DataManager.prototype.fetchNextChart = function (start, end, unit) {
        return __awaiter(this, void 0, void 0, function () {
            var promises, date, _loop_1, this_1, files, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = [];
                        date = new Date(start);
                        _loop_1 = function () {
                            var dateString = date.toISOString().split("T")[0];
                            promises.push(fetch("https://data.binance.vision/data/spot/daily/klines/" + this_1.PAIR + "/" + unit + "/" + this_1.PAIR + "-" + unit + "-" + dateString + ".zip")
                                .then(function (res) { return res.buffer(); })
                                .then(function (r) { return new admZip(r); })
                                .then(function (f) { return f.getEntries()[0]; })
                                .then(function (zip) {
                                console.log("downloded: ", dateString, unit);
                                return zip;
                            })
                                .catch(console.log));
                            date.setDate(date.getDate() + 1);
                        };
                        this_1 = this;
                        while (date.getTime() < end + 1000 * 60 * 60 * 24) {
                            _loop_1();
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        files = _a.sent();
                        data = files.filter(function (x) { return x; })
                            .map(function (e) { return e.getData().toString().split("\n")
                            .filter(function (r) { return r; })
                            .map(function (x) { return x.split(",")
                            .map(function (y) { return parseFloat(y); }); }); })
                            .flat();
                        this.charts[unit] = data.map(function (_a) {
                            var time = _a[0], open = _a[1], high = _a[2], low = _a[3], close = _a[4];
                            return (Object.assign(new CandleStick(), { time: time, high: high, low: low, close: close }));
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    DataManager.prototype.fetchAllCharts = function (start, end) {
        return __awaiter(this, void 0, void 0, function () {
            var i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.fetchNextChart(start, end, "1s"),
                            this.fetchNextChart(start, end, "1m"),
                            this.fetchNextChart(start, end, "5m"),
                            this.fetchNextChart(start, end, "15m"),
                            this.fetchNextChart(start, end, "1h")
                        ])];
                    case 1:
                        _a.sent();
                        for (i = this.charts["1s"].length - 1; i > 0; i--) {
                            if (this.charts["1s"][i].time != this.charts["1s"][i - 1].time + 1000) {
                                this.charts["1s"].splice(i, 0, Object.assign(new CandleStick(), this.charts["1s"][i]));
                            }
                        }
                        this.chart = this.chart.slice(this.chart.length - this.MIN_CHART_SIZE);
                        this.chart = this.chart.concat(this.charts["1s"]);
                        this.currentHour = 0;
                        return [2 /*return*/];
                }
            });
        });
    };
    DataManager.prototype.checkOrder = function (orders) {
        var ordersFound = orders;
        for (var _i = 0, _a = this.UNIT_TIMES; _i < _a.length; _i++) {
            var unit = _a[_i];
            var candleIndex = this.currentHour * this.UNIT_HOUR_CANDLES[unit] + Math.floor(this.offsetInHour / (3600 / this.UNIT_HOUR_CANDLES[unit]));
            var found = false;
            var _loop_2 = function (i) {
                var t = this_2.charts[unit][candleIndex + i];
                if (!t) {
                    debugger;
                }
                var ordersInInreval = ordersFound.filter(function (o) {
                    return ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "BUY" || o.type == "STOP_MARKET" && o.side == "SELL") && o.price > t.low ||
                        ("LIMIT|TAKE_PROFIT_MARKET".includes(o.type) && o.side == "SELL" || o.type == "STOP_MARKET" && o.side == "BUY") && o.price < t.high;
                });
                if (ordersInInreval.length > 0) {
                    ordersFound = ordersInInreval;
                    if (unit == "1s") {
                        return { value: ordersFound };
                    }
                    found = true;
                    return "break";
                }
                else {
                    var offset = (3600 / this_2.UNIT_HOUR_CANDLES[unit]) % 3600;
                    this_2.offsetInHour += offset;
                    this_2.currentCandle += offset;
                }
            };
            var this_2 = this;
            for (var i = 0; i < this.UNIT_HOUR_CANDLES[unit]; i++) {
                var state_1 = _loop_2(i);
                if (typeof state_1 === "object")
                    return state_1.value;
                if (state_1 === "break")
                    break;
            }
            if (!found) {
                break;
            }
        }
        this.currentHour++;
        this.offsetInHour = 0;
        this.currentCandle += 3600 - (this.currentCandle % 3600);
        return [];
    };
    DataManager.prototype.findIndexBetween = function (time, chart) {
        if (time < chart[0].time) {
            return 0;
        }
        for (var i = 0; i < chart.length - 1; i++) {
            if (chart[i].time < time && chart[i + 1].time >= time) {
                return i;
            }
        }
        if (time > chart[chart.length - 1].time) {
            return chart.length - 1;
        }
        return -1;
    };
    DataManager.prototype.orderexecute = function (order, t) {
        var amount = order.avgPrice * order.executedQty;
        var direction = order.side == "BUY" ? 1 : -1;
        this.bot.binance.balance[this.bot.coin2].available -= amount * direction;
        this.bot.binance.balance[this.bot.coin2].total -= amount * direction;
        this.bot.binance.balance[this.bot.coin1].available += order.executedQty * direction;
        this.bot.binance.balance[this.bot.coin1].total += order.executedQty * direction;
        order.status = 'FILLED';
        this.bot.binance.orders[this.PAIR].push(order);
        console.log("Orders Executed: ", this.bot.binance.orders[this.PAIR].length);
        if (order.side == "SELL") {
            // console.log("balance: " + (this.bot.binance!.balance[this.bot.coin2].available))
            //Check if 
            if (this.bot.binance.balance[this.bot.coin1].available < this.filters.MIN_NOTIONAL.minNotional / order.avgPrice) {
                DALSimulation_1.DAL.instance.logStep({ type: 'Close Position', priority: 5 });
                this.bot.binance.orders[this.PAIR] = [order];
            }
        }
        DALSimulation_1.DAL.instance.logStep({
            type: order.type == "STOP_MARKET" ? "StopLoose" : 'Execute',
            side: order.side,
            high: t.high,
            low: t.low,
            price: order.price,
            quantity: order.executedQty,
            balanceSecond: (this.bot.binance.balance[this.bot.coin2].available).toFixed(2),
            balanceFirst: (this.bot.binance.balance[this.bot.coin1].available).toFixed(2),
            priority: 1
        });
    };
    DataManager.prototype.closePosition = function (price) {
        this.bot.binance.balance[this.bot.coin2].available += this.bot.binance.balance[this.bot.coin1].available * price;
        this.bot.binance.balance[this.bot.coin2].total += this.bot.binance.balance[this.bot.coin1].total * price;
        this.bot.binance.balance[this.bot.coin1].available = 0;
        this.bot.binance.balance[this.bot.coin1].total = 0;
        this.profit = this.bot.binance.balance[this.bot.coin2].available - 10000;
    };
    DataManager.prototype.initData = function () {
        var _a, _b;
        this.bot.binance = new Models_1.Account(Binance());
        this.bot.binance.balance = {};
        this.bot.binance.balance[this.bot.coin2] = this.bot.isFuture ? 10000 : {
            available: 10000,
            total: 10000
        };
        this.bot.binance.balance[this.bot.coin1] = this.bot.isFuture ? 0 : {
            available: 0,
            total: 0
        };
        this.bot.binance.orders = [{}];
        this.bot.binance.positions = [];
        this.bot.binance.socket = {
            prices: {},
            orderBooks: {}
        };
        this.bot.binance.orders[this.PAIR] = [new Models_1.Order()];
        this.sockets.prices[this.PAIR] = 1;
        this.bot.binance.positions = {};
        (_a = this.bot.binance.positions)[_b = this.PAIR + this.bot.positionSide()] || (_a[_b] = {
            positionAmount: 0,
            positionEntry: 0
        });
    };
    DataManager.prototype.averagePrice = function (pair, steps) {
        var count = Math.min(this.currentCandle, (steps * 5 * 60));
        var start = this.currentCandle - count;
        return this.chart
            .map(function (x) { return x.close; })
            .slice(start, this.currentCandle)
            .reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }, 0) / count;
    };
    DataManager.prototype.averagePriceQuarter = function (pair) {
        var count = Math.min(this.currentCandle, (15 * 500 * 60));
        var start = this.currentCandle - count;
        return this.chart
            .map(function (x) { return x.close; })
            .slice(start, this.currentCandle)
            .reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }) / count;
    };
    DataManager.prototype.simulateState = function () {
        // if (!this.bot.avoidCancel){
        this.openOrders = [];
        // }
        this.sockets.orderBooks[this.PAIR] = {
            "asks": {},
            "bids": {},
        };
        this.sockets.orderBooks[this.PAIR].asks[this.chart[this.currentCandle].high] = 1;
        this.sockets.orderBooks[this.PAIR].bids[this.chart[this.currentCandle].low] = 1;
    };
    DataManager.prototype.ticker = function (p) {
        var t = new Ticker();
        t.bestBid = this.chart[this.currentCandle].close;
        return t;
    };
    return DataManager;
}());
exports.DataManager = DataManager;
var CandleStick = /** @class */ (function () {
    function CandleStick() {
    }
    return CandleStick;
}());
exports.CandleStick = CandleStick;
var Ticker = /** @class */ (function () {
    function Ticker() {
    }
    return Ticker;
}());
