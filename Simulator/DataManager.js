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
        this.fullChart = [];
        this.chart = [];
        this.openOrders = [];
        this.time = 0;
        this.profit = 0;
        this.openOrder = function (type) { return (function (coin, qu, price, params) {
            var p = price || params.stopPrice || params.activationPrice;
            // if (type ? p > this.chart[this.time].high :  p < this.chart[this.time].low) {
            //     return {msg:"Order Expire"}
            // }
            var order = new Models_1.Order(type ? 'BUY' : "SELL", "NEW", p, _this.makeid(10), qu, qu, _this.time, params.type || "LIMIT", params.newClientOrderId, _this.bot.positionSide(), p);
            order.closePosition = params.closePosition;
            _this.openOrders.push(order);
            DALSimulation_1.DAL.instance.logStep({
                type: 'OpenOrder', side: order.side, price: order.price, quantity: order.origQty, priority: 8,
                high: _this.chart[_this.time].high,
                low: _this.chart[_this.time].low,
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
    DataManager.prototype.fetchChart = function () {
        return __awaiter(this, void 0, void 0, function () {
            var promises, start, end, date, dateString, files, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promises = [];
                        start = new Date(process.argv[4]).getTime() - (this.bot.SMA * 5 * 60 * 1000);
                        end = new Date(process.argv[5]).getTime();
                        date = new Date(start);
                        while (date.getTime() < end + 1000 * 60 * 60 * 24) {
                            dateString = date.toISOString().split("T")[0];
                            promises.push(fetch("https://data.binance.vision/data/spot/daily/klines/MATICUSDT/1s/MATICUSDT-1s-" + dateString + ".zip")
                                .then(function (res) { return res.buffer(); })
                                .then(function (r) { return new admZip(r); })
                                .catch(console.log));
                            date.setDate(date.getDate() + 1);
                        }
                        return [4 /*yield*/, Promise.all(promises)];
                    case 1:
                        files = _a.sent();
                        data = files.filter(function (x) { return x; }).map(function (f) { return f.getEntries()[0]; })
                            .map(function (e) { return e.getData().toString().split("\n").map(function (x) { return x.split(",").map(function (y) { return parseFloat(y); }); }); }).flat();
                        this.startIndex = this.findIndexBetween(start, data);
                        this.endIndex = this.findIndexBetween(end, data);
                        this.time = this.bot.SMA * 5;
                        this.fullChart = data.map(function (_a) {
                            var time = _a[0], high = _a[1], low = _a[2], close = _a[3];
                            return (Object.assign(new CandleStick(), { time: time, high: high, low: low, close: close }));
                        });
                        this.chart = this.fullChart.slice(this.startIndex, this.endIndex);
                        return [2 /*return*/];
                }
            });
        });
    };
    DataManager.prototype.findIndexBetween = function (time, chart) {
        if (time < chart[0][0]) {
            return 0;
        }
        for (var i = 0; i < chart.length - 1; i++) {
            if (chart[i][0] < time && chart[i + 1][0] >= time) {
                return i;
            }
        }
        if (time > chart[chart.length - 1][0]) {
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
        var start = Math.max(this.time - (steps * 5), 0);
        return this.chart.map(function (x) { return x.close; }).slice(start, this.time).reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }, 0) / (steps * 5);
    };
    DataManager.prototype.averagePriceQuarter = function (pair) {
        var startTime = this.time + this.startIndex;
        return this.fullChart.map(function (x) { return x.close; }).slice(Math.max(startTime - 7500, 0), startTime).reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }) / Math.min(startTime, 7500);
    };
    DataManager.prototype.simulateState = function () {
        // if (!this.bot.avoidCancel){
        this.openOrders = [];
        // }
        this.sockets.orderBooks[this.PAIR] = {
            "asks": {},
            "bids": {},
        };
        this.sockets.orderBooks[this.PAIR].asks[this.chart[this.time].high] = 1;
        this.sockets.orderBooks[this.PAIR].bids[this.chart[this.time].low] = 1;
    };
    DataManager.prototype.ticker = function (p) {
        var t = new Ticker();
        t.bestBid = this.chart[this.time].close;
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
