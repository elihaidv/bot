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
exports.BasePlacer = void 0;
var DAL_1 = require("../DAL");
var Logger_1 = require("../Logger");
var Models_1 = require("../Models");
var Sockets_1 = require("../Sockets/Sockets");
var BasePlacer = /** @class */ (function () {
    function BasePlacer(_bot, _exchangeInfo) {
        var _this = this;
        var _a, _b, _c;
        this.distanceTimestamp = 0;
        this.currentPnl = 0;
        this.sockets = Sockets_1.Sockets.getInstance();
        this.error = false;
        this.buySide = function () { return _this.bot.direction ? "SELL" : "BUY"; };
        this.sellSide = function () { return _this.bot.direction ? "BUY" : "SELL"; };
        this.roundQu = function (qu) { return _this.truncDigits(qu, _this.countDecimals(parseFloat(_this.filters.LOT_SIZE.stepSize))); };
        this.roundPrice = function (price) { return _this.truncDigits(price, _this.countDecimals(parseFloat(_this.filters.PRICE_FILTER.tickSize))); };
        this.truncDigits = function (number, digits, roundFunc) {
            if (roundFunc === void 0) { roundFunc = Math.floor; }
            var fact = Math.pow(10, digits);
            return roundFunc(number * fact) / fact;
        };
        this.countDecimals = function (number) {
            if (Math.floor(number) === number) {
                return 0;
            }
            if (number.toString().includes("-")) {
                return parseInt(number.toString().split("-")[1]);
            }
            if (!number.toString().includes("."))
                return 0;
            return number.toString().split(".")[1].length || 0;
        };
        this.FIRST = _bot.coin1;
        this.SECOND = _bot.coin2;
        this.PAIR = _bot.coin1 + _bot.coin2;
        this.binance = (_a = _bot.binance) === null || _a === void 0 ? void 0 : _a.binance;
        this.balance = (_b = _bot.binance) === null || _b === void 0 ? void 0 : _b.balance;
        this.orders = (_c = _bot.binance) === null || _c === void 0 ? void 0 : _c.orders[this.PAIR];
        this.exchangeInfo = _exchangeInfo.symbols.find(function (s) { return s.symbol == _this.PAIR; });
        this.filters = this.exchangeInfo.filters.reduce(function (a, b) { a[b.filterType] = b; return a; }, {});
        this.bot = _bot;
        this.bot.status = Models_1.BotStatus.WORK;
    }
    BasePlacer.prototype.buyBNB = function () {
        return __awaiter(this, void 0, void 0, function () {
            var bnbPair, e_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this.bot.minbnb && this.balance.get("BNB").available < this.bot.minbnb && !this.PAIR.includes('BNB'))) return [3 /*break*/, 4];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        bnbPair = this.exchangeInfo.symbols
                            .find(function (s) { return s.symbol == 'BNB' + _this.SECOND; }) ? 'BNB' + this.SECOND : this.FIRST + 'BNB';
                        return [4 /*yield*/, this.binance.marketBuy(bnbPair, this.bot.bnbamount)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        console.log(e_1);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    BasePlacer.prototype.align = function (price, direction, qu) {
        var tick = parseFloat(this.filters.PRICE_FILTER.tickSize) || this.bot.tickSize;
        var book = this.sockets.orderBooks[this.PAIR][direction ? "bids" : "asks"];
        for (var orderPrice in book) {
            if (direction && price > orderPrice && qu < (book[orderPrice] * 2)) {
                return parseFloat(orderPrice) + tick;
            }
            if (!direction && price < orderPrice && qu < (book[orderPrice] * 2)) {
                return parseFloat(orderPrice) - tick;
            }
        }
        return price;
    };
    BasePlacer.prototype.buildHistory = function () {
        var _this = this;
        var buys = Array();
        var sellOrders = [];
        this.myLastOrder = undefined;
        var _loop_1 = function (order) {
            this_1.myLastOrder || (this_1.myLastOrder = order);
            if (order.side == this_1.buySide()) {
                this_1.lastBuy || (this_1.lastBuy = order);
                if (!sellOrders.join("").includes(order.orderId)) {
                    this_1.standingBuy || (this_1.standingBuy = order);
                    this_1.oldestStandingBuy = order;
                    buys.push(order);
                }
            }
            else {
                this_1.lastSell || (this_1.lastSell = order);
                if (order.clientOrderId.includes("SELLbig") && !this_1.myLastStandingBuy) {
                    this_1.myLastStandingBuy = this_1.orders.find(function (x) { return x.orderId == order.clientOrderId.split("SELLbig")[1]; });
                }
                sellOrders.push(order.clientOrderId);
            }
            this_1.currentPnl += order.pnl - (order.avgPrice * order.executedQty * 0.0002);
            if (order.isFirst()) {
                return "break";
            }
        };
        var this_1 = this;
        for (var _i = 0, _a = this.orders
            .filter(function (x) { return x.status.includes('FILLED'); })
            .filter(function (x) { return x.positionSide == _this.bot.positionSide(); })
            .reverse(); _i < _a.length; _i++) {
            var order = _a[_i];
            var state_1 = _loop_1(order);
            if (state_1 === "break")
                break;
        }
        this.myLastBuyAvg = this.weightAverage(buys);
    };
    BasePlacer.prototype.weightAverage = function (arr) {
        var overallQu = arr.reduce(function (a, b) { return a + parseFloat(b.executedQty); }, 0.0);
        return arr.reduce(function (a, b) { return a + (parseFloat(b.price) * (b.executedQty / overallQu)); }, 0.0);
    };
    BasePlacer.prototype.place_order = function (coin, qu, price, type, params, increaseToMinimum) {
        if (increaseToMinimum === void 0) { increaseToMinimum = false; }
        return __awaiter(this, void 0, void 0, function () {
            var minNotional, action, res, error, e_2, error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        minNotional = this.filters.MIN_NOTIONAL.minNotional || this.filters.MIN_NOTIONAL.notional || this.bot.minNotional;
                        if (coin == "BNB") {
                            qu -= this.bot.minbnb;
                        }
                        action = this.getAction(type);
                        if (this.bot.align) {
                            price = this.align(price, type, qu);
                        }
                        qu = this.roundQu(qu);
                        this.bot.lastOrder = new Date().getTime();
                        if (price) {
                            price = this.roundPrice(price);
                            if ((qu * price) < minNotional && !(params === null || params === void 0 ? void 0 : params.closePosition) && !(params === null || params === void 0 ? void 0 : params.reduceOnly)) {
                                if (increaseToMinimum) {
                                    qu = this.roundQu((parseFloat(minNotional) + 1) / price);
                                }
                                else {
                                    Logger_1.BotLogger.instance.log({
                                        type: "QuantitiyTooLow",
                                        bot_id: this.bot._id,
                                        qu: qu,
                                        price: price,
                                        params: params,
                                        minNotional: minNotional
                                    });
                                    console.log("quantity is to small", qu, price, this.bot._id);
                                    return [2 /*return*/];
                                }
                            }
                        }
                        this.bot.lastOrder = new Date().getTime();
                        params || (params = {});
                        params.positionSide = this.bot.positionSide();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, 4, 5]);
                        return [4 /*yield*/, action(this.PAIR, qu, price, params)];
                    case 2:
                        res = _a.sent();
                        if (res.msg) {
                            console.log(res.msg, this.PAIR, price || params.stopPrice || params.activationPrice, qu, this.bot.id());
                            error = {
                                type: "PlaceOrderError",
                                bot_id: this.bot._id,
                                user_id: this.bot.user_id,
                                side: type,
                                coin: this.PAIR,
                                amount: qu,
                                price: price || params.stopPrice || params.activationPrice,
                                message: res.msg,
                                created_at: new Date()
                            };
                            DAL_1.DAL.instance.logError(error);
                            Logger_1.BotLogger.instance.error(error);
                            this.error = true;
                            return [2 /*return*/, res];
                        }
                        else {
                            console.log(res.symbol, res.side, res.price || params.stopPrice || params.activationPrice, res.origQty, res.status);
                            Logger_1.BotLogger.instance.log({
                                type: "PlaceOrder",
                                bot_id: this.bot._id,
                                res: res
                            });
                            if (res.status == "EXPIRED") {
                                return [2 /*return*/, res.status];
                            }
                        }
                        return [3 /*break*/, 5];
                    case 3:
                        e_2 = _a.sent();
                        console.log(e_2.body || e_2, this.PAIR, price, qu, this.bot.id());
                        this.error = true;
                        error = {
                            type: "PlaceOrderError",
                            bot_id: this.bot._id,
                            user_id: this.bot.user_id,
                            side: type,
                            coin: this.PAIR,
                            amount: qu,
                            price: price,
                            message: e_2.body || e_2,
                            created_at: new Date()
                        };
                        DAL_1.DAL.instance.logError(error);
                        Logger_1.BotLogger.instance.error(error);
                        return [2 /*return*/, e_2];
                    case 4: return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    BasePlacer.prototype.parseAllValues = function () {
        for (var k in this.bot) {
            if (parseFloat(this.bot[k]) == this.bot[k]) {
                this.bot[k] = parseFloat(this.bot[k]);
            }
        }
    };
    Object.defineProperty(BasePlacer.prototype, "isSemulation", {
        get: function () {
            return process.argv.join("").includes("Simulate");
        },
        enumerable: false,
        configurable: true
    });
    return BasePlacer;
}());
exports.BasePlacer = BasePlacer;
