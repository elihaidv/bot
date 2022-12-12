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
exports.Sockets = void 0;
var BaseSockets_1 = require("./BaseSockets");
var Models_1 = require("../Models");
var Logger_1 = require("../Logger");
var Binance = require('node-binance-api');
var Sockets = /** @class */ (function (_super) {
    __extends(Sockets, _super);
    function Sockets() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.compare = function (arr1, arr2) {
            return !arr1.filter(function (i) { return arr2.indexOf(i) == -1; }).length && !arr2.filter(function (i) { return arr1.indexOf(i) == -1; }).length;
        };
        _this.averagePrice = function (pair, steps) { return _this.prices[pair].slice(0, steps).reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }, 0) / steps; };
        _this.balance_update = function (key, orders) { return function (data) {
            if (data.e == "outboundAccountPosition") {
                for (var _i = 0, _a = data.B; _i < _a.length; _i++) {
                    var obj = _a[_i];
                    key[obj.a] = {
                        available: obj.f,
                        onOrder: obj.l,
                        total: parseFloat(obj.f) + parseFloat(obj.l)
                    };
                }
            }
            else if (data.e == "executionReport") {
                if (!orders[data.s])
                    orders[data.s] = [];
                var order = orders[data.s].find(function (o) { return o.orderId == data.i; });
                var newOrder = new Models_1.Order(data.S, data.X, data.p, data.i, data.q, data.z, data.E, data.o, data.c);
                if (order) {
                    Object.assign(order, newOrder);
                }
                else {
                    orders[data.s].push(newOrder);
                }
                if (data.x == 'TRADE') {
                    orders.changed.push(data.s);
                    console.log(data.S, data.s);
                    Logger_1.BotLogger.instance.log({
                        type: "OrderFilled - Spot",
                        order: order
                    });
                }
            }
        }; };
        _this.execution_update = function (orders) { return function (data) {
            console.log(data);
            Logger_1.BotLogger.instance.log({
                type: "TradeEvent1",
                message: JSON.stringify(data)
            });
            if (!orders[data.s])
                orders[data.s] = [];
            var order = orders[data.s].find(function (o) { return o.orderId == data.i; });
            var newOrder = new Models_1.Order(data.S, data.X, data.p, data.i, data.q, data.z, data.E, data.o);
            if (order) {
                Object.assign(order, newOrder);
            }
            else {
                orders[data.s].push(newOrder);
            }
            if (newOrder.status == 'FILLED') {
                orders.changed.push(data.s);
                // console.log(data.S, data.s)
            }
        }; };
        return _this;
    }
    Sockets.getInstance = function () {
        if (!Sockets.instance) {
            Sockets.instance = new Sockets();
        }
        return Sockets.instance;
    };
    Sockets.prototype.updateDepthSockets = function () {
        var _this = this;
        if (this.depthCacheSocket)
            this.binance.websockets.terminate(this.depthCacheSocket);
        this.depthCacheSocket = this.binance.websockets.depthCache(this.pairs.filter(function (x) { return x; }), function (symbol, depth) {
            if (!_this.orderBooks[symbol])
                _this.orderBooks[symbol] = {};
            _this.orderBooks[symbol].bids = _this.binance.sortBids(depth.bids);
            _this.orderBooks[symbol].asks = _this.binance.sortAsks(depth.asks);
        });
    };
    Sockets.prototype.addUserDataSockets = function (acc) {
        acc.binance.balance(function (error, balances) {
            if (error) {
                console.log('Balance error' + error.body);
                Logger_1.BotLogger.instance.error({
                    type: "BalanceError - Spot",
                    account: acc,
                    error: error
                });
            }
            for (var b in balances) {
                balances[b].total = parseFloat(balances[b].available) + parseFloat(balances[b].onOrder);
            }
            Object.assign(acc.balance, balances);
        });
        try {
            acc.socket = acc.binance.websockets.userData(this.balance_update(acc.balance, acc.orders), this.execution_update(acc.orders));
        }
        catch (e) {
            console.log("UserSokcet", e.message);
            Logger_1.BotLogger.instance.error({
                type: "UserSokcetError - Spot",
                account: acc,
                e: e
            });
        }
    };
    Sockets.prototype.fetchInitOrders = function (bots) {
        var _loop_1 = function (bot) {
            var PAIR = bot.coin1 + bot.coin2;
            var acc = this_1.accounts[bot.key_id];
            if (acc.orders[PAIR] === undefined) {
                acc.orders[PAIR] = [];
                acc.binance.openOrders(PAIR, function (error, trades, symbol) {
                    if (trades.map)
                        acc.orders[PAIR] = acc.orders[PAIR].concat(trades.map(function (t) { return Object.assign(new Models_1.Order(), t); }));
                });
                acc.binance.allOrders(PAIR, function (error, trades, symbol) {
                    if (trades.map) {
                        var orders = trades.map(function (t) { return new Models_1.Order(t.side, t.status, t.price, t.orderId, parseFloat(t.origQty), parseFloat(t.executedQty), t.time, t.type, t.clientOrderId); });
                        var firstOrder = void 0;
                        for (var _i = 0, orders_1 = orders; _i < orders_1.length; _i++) {
                            var o = orders_1[_i];
                            if (!firstOrder) {
                                firstOrder = o;
                            }
                            else if (firstOrder.orderId != o.orderId) {
                                acc.orders[PAIR].push(firstOrder);
                                firstOrder = o;
                            }
                            else {
                                firstOrder.origQty += o.origQty;
                            }
                        }
                        firstOrder && acc.orders[PAIR].push(firstOrder);
                    }
                }, { limit: 1000 });
            }
        };
        var this_1 = this;
        for (var _i = 0, bots_1 = bots; _i < bots_1.length; _i++) {
            var bot = bots_1[_i];
            _loop_1(bot);
        }
    };
    Sockets.prototype.updateSockets = function (bots, keys) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isPairsChanged(bots)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.updateDepthSockets()];
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
    return Sockets;
}(BaseSockets_1.BaseSockets));
exports.Sockets = Sockets;
