"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.SocketsFutures = void 0;
var BaseSockets_1 = require("./BaseSockets");
var Models_1 = require("../Models");
var Logger_1 = require("../Logger");
var SocketsFutures = /** @class */ (function (_super) {
    __extends(SocketsFutures, _super);
    function SocketsFutures() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.futuresBookTickerStreams = new Array();
        _this.account_update = function (balance, positions, orders) { return function (data) {
            var _a;
            if (data.eventType == "ACCOUNT_UPDATE") {
                for (var _i = 0, _b = data.updateData.balances; _i < _b.length; _i++) {
                    var obj = _b[_i];
                    balance[obj.asset] = obj.walletBalance;
                }
                for (var _c = 0, _d = data.updateData.positions; _c < _d.length; _c++) {
                    var obj = _d[_c];
                    positions[obj.symbol + obj.positionSide] = obj;
                }
            }
            else if (data.eventType == "ORDER_TRADE_UPDATE") {
                var orderUpdate_1 = data.order;
                // console.log(orderUpdate)
                orders[_a = orderUpdate_1.symbol] || (orders[_a] = []);
                var order = orders[orderUpdate_1.symbol].find(function (o) { return o.orderId.toString() == orderUpdate_1.orderId.toString(); });
                var newOrder = new Models_1.Order(orderUpdate_1.side, orderUpdate_1.orderStatus, orderUpdate_1.originalPrice, orderUpdate_1.orderId, orderUpdate_1.originalQuantity, orderUpdate_1.originalQuantity, orderUpdate_1.orderTradeTime, orderUpdate_1.orderType, orderUpdate_1.clientOrderId, orderUpdate_1.positionSide, orderUpdate_1.averagePrice);
                if (order) {
                    newOrder.pnl = order.pnl + parseFloat(orderUpdate_1.realizedProfit);
                    Object.assign(order, newOrder);
                }
                else {
                    newOrder.pnl = parseFloat(orderUpdate_1.realizedProfit);
                    orders[orderUpdate_1.symbol].push(newOrder);
                }
                if (orderUpdate_1.orderStatus == 'FILLED' ||
                    (orderUpdate_1.orderStatus == 'EXPIRED' && orderUpdate_1.orderType == "LIMIT" && orderUpdate_1.originalOrderType != "TAKE_PROFIT")) {
                    if (!orderUpdate_1.clientOrderId.includes("BigPosition")) {
                        orders.changed.push(orderUpdate_1.symbol + orderUpdate_1.positionSide);
                        Logger_1.BotLogger.instance.log({
                            type: "OrderFilled - Futures",
                            orderUpdate: orderUpdate_1
                        });
                    }
                }
                if (orderUpdate_1.orderStatus == 'EXPIRED') {
                    console.log('EXPIRED:', orderUpdate_1.symbol, orderUpdate_1.side, orderUpdate_1.originalPrice, orderUpdate_1.orderTradeTime);
                    Logger_1.BotLogger.instance.log({
                        type: 'OrderExpiered',
                        orderUpdate: orderUpdate_1
                    });
                }
            }
        }; };
        _this.fetchOrdersBySymbol = function (acc, PAIR) { return __awaiter(_this, void 0, void 0, function () {
            var openOrders, trades;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(acc.orders[PAIR] === undefined)) return [3 /*break*/, 4];
                        acc.orders[PAIR] = [];
                        return [4 /*yield*/, acc.binance.futuresAllOrders(PAIR, { limit: 1000 })];
                    case 1:
                        openOrders = _a.sent();
                        if (openOrders.code)
                            throw openOrders.msg;
                        acc.orders[PAIR] = acc.orders[PAIR].concat(openOrders.filter(function (o) { return o.status != "CANCELED"; }).map(function (order) {
                            var o = Object.assign(new Models_1.Order(), order);
                            o.price || (o.price = order.avgPrice);
                            return o;
                        }));
                        acc.orders[PAIR].push(new Models_1.Order());
                        return [4 /*yield*/, acc.binance.futuresUserTrades(PAIR)];
                    case 2:
                        trades = _a.sent();
                        if (trades.code)
                            throw trades.msg;
                        trades.forEach(function (t) {
                            var o = acc.orders[PAIR].find(function (o) { return o.orderId.toString() == t.orderId.toString(); });
                            if (o)
                                o.pnl += parseFloat(t.realizedPnl);
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
                        return [4 /*yield*/, this.timeout(500)];
                    case 3:
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
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        }); };
        return _this;
    }
    SocketsFutures.getFInstance = function () {
        if (!SocketsFutures.finstance) {
            SocketsFutures.finstance = new SocketsFutures();
        }
        return SocketsFutures.finstance;
    };
    SocketsFutures.prototype.addUserDataSockets = function (acc) {
        acc.binance.futuresAccount().then(function (data) {
            data.assets && data.assets.forEach(function (a) {
                acc.balance[a.asset] = a.walletBalance;
            });
            data.positions && data.positions.filter(function (p) { return p.updateTime; }).forEach(function (p) {
                acc.positions[p.symbol + p.positionSide] = p;
            });
        });
        acc.binance.websockets.userFutureData(console.log, this.account_update(acc.balance, acc.positions, acc.orders), this.account_update(acc.balance, acc.positions, acc.orders), function (s) { return acc.socket = s; });
    };
    SocketsFutures.prototype.updateBookTickerStream = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _loop_1, this_1, _i, _a, p;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this.futuresBookTickerStreams.forEach(function (t) { return _this.binance.websockets.terminate(t.pair); });
                        this.futuresBookTickerStreams = [];
                        _loop_1 = function (p) {
                            var ticker;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        ticker = new Ticker();
                                        ticker.pair = p;
                                        ticker.stream = this_1.binance.futuresBookTickerStream(p, function (_a) {
                                            var bestAsk = _a.bestAsk, bestBid = _a.bestBid;
                                            ticker.bestAsk = bestAsk;
                                            ticker.bestBid = bestBid;
                                        });
                                        this_1.futuresBookTickerStreams.push(ticker);
                                        return [4 /*yield*/, this_1.timeout(500)];
                                    case 1:
                                        _c.sent();
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, _a = this.pairs;
                        _b.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        p = _a[_i];
                        return [5 /*yield**/, _loop_1(p)];
                    case 2:
                        _b.sent();
                        _b.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SocketsFutures.prototype.ticker = function (pair) {
        return this.futuresBookTickerStreams.find(function (t) { return t.pair == pair; });
    };
    SocketsFutures.prototype.fetchInitOrders = function (bots) {
        return __awaiter(this, void 0, void 0, function () {
            var _i, bots_1, bot, PAIR, acc, _a, _b, s, e_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _i = 0, bots_1 = bots;
                        _c.label = 1;
                    case 1:
                        if (!(_i < bots_1.length)) return [3 /*break*/, 10];
                        bot = bots_1[_i];
                        PAIR = bot.coin1 + bot.coin2;
                        acc = this.accounts[bot.key_id];
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 8, , 9]);
                        return [4 /*yield*/, this.fetchOrdersBySymbol(acc, PAIR)];
                    case 3:
                        _c.sent();
                        if (!bot.signalings) return [3 /*break*/, 7];
                        _a = 0, _b = bot.signalings;
                        _c.label = 4;
                    case 4:
                        if (!(_a < _b.length)) return [3 /*break*/, 7];
                        s = _b[_a];
                        return [4 /*yield*/, this.fetchOrdersBySymbol(acc, s.coin1 + s.coin2)];
                    case 5:
                        _c.sent();
                        _c.label = 6;
                    case 6:
                        _a++;
                        return [3 /*break*/, 4];
                    case 7: return [3 /*break*/, 9];
                    case 8:
                        e_1 = _c.sent();
                        acc.orders[PAIR] = undefined;
                        console.error("FetchInit Error: ", e_1, " Bot Id: ", bot.id());
                        Logger_1.BotLogger.instance.error({
                            type: "FetchInitError - Futures",
                            botId: bot.id(),
                            error: e_1,
                            pair: PAIR
                        });
                        return [3 /*break*/, 9];
                    case 9:
                        _i++;
                        return [3 /*break*/, 1];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    SocketsFutures.prototype.updateSockets = function (bots, keys) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isPairsChanged(bots)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.updateBookTickerStream()];
                    case 1:
                        _a.sent();
                        this.updatePricesSockets();
                        _a.label = 2;
                    case 2: return [4 /*yield*/, this.updateBalancesSockets(bots, keys)];
                    case 3:
                        _a.sent();
                        return [4 /*yield*/, this.fetchInitOrders(bots)];
                    case 4:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return SocketsFutures;
}(BaseSockets_1.BaseSockets));
exports.SocketsFutures = SocketsFutures;
var Ticker = /** @class */ (function () {
    function Ticker() {
    }
    return Ticker;
}());
