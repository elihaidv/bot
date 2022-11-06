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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FutureTrader = void 0;
var BasePlacer_1 = require("./BasePlacer");
var Models_1 = require("../Models");
var SocketsFuture_1 = require("../Sockets/SocketsFuture");
var Logger_1 = require("../Logger");
var FutureTrader = /** @class */ (function (_super) {
    __extends(FutureTrader, _super);
    function FutureTrader() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.positionAmount = 0;
        _this.positionEntry = 0;
        _this.futureSockets = SocketsFuture_1.SocketsFutures.getFInstance();
        return _this;
    }
    FutureTrader.prototype.getAction = function (type) {
        return type ? this.binance.futuresBuy : this.binance.futuresSell;
    };
    FutureTrader.prototype.place = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, binance, bot, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!this.binance || !this.balance[this.SECOND] || !this.futureSockets.prices[this.PAIR] || !this.orders || !this.orders.length || !this.futureSockets.ticker(this.PAIR))
                            return [2 /*return*/];
                        _a = this.bot, binance = _a.binance, bot = __rest(_a, ["binance"]);
                        Logger_1.BotLogger.instance.log({
                            type: "BotStart - Future",
                            bot_id: this.bot._id,
                            bot: bot,
                        });
                        this.parseAllValues();
                        this.calculatePrice();
                        this.calculateDirection();
                        this.buildHistory();
                        return [4 /*yield*/, this.placeBuy()];
                    case 1:
                        _c.sent();
                        _b = this.positionAmount != 0;
                        if (!_b) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.placeSell()];
                    case 2:
                        _b = (_c.sent());
                        _c.label = 3;
                    case 3:
                        _b;
                        return [2 /*return*/];
                }
            });
        });
    };
    FutureTrader.prototype.minFunc = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        if (this.isSemulation) {
            values.pop();
        }
        return this.bot.direction ? Math.max.apply(Math, values) : Math.min.apply(Math, values);
    };
    FutureTrader.prototype.maxFunc = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i] = arguments[_i];
        }
        if (this.isSemulation) {
            values.pop();
        }
        return this.bot.direction ? Math.min.apply(Math, values) : Math.max.apply(Math, values);
    };
    FutureTrader.prototype.calculatePrice = function () {
        var _a, _b;
        if (!this.isEmptyObject((_a = this.bot.binance) === null || _a === void 0 ? void 0 : _a.positions)) {
            var pos = (_b = this.bot.binance) === null || _b === void 0 ? void 0 : _b.positions[this.PAIR + this.bot.positionSide()];
            if (pos) {
                this.positionAmount = Math.abs(pos.positionAmt ||
                    pos.positionAmount);
                this.positionEntry = pos.entryPrice ||
                    pos.positionEntry;
                this.positionDirection = (pos.positionAmt ||
                    pos.positionAmount) < 0;
            }
        }
    };
    FutureTrader.prototype.calculateDirection = function () {
        var _a;
        if (this.bot.direction > 1) {
            this.bot.dynamicDirection = true;
        }
        if (this.bot.dynamicDirection) {
            if (!this.positionAmount) {
                var maxBuyPrice = (_a = this.futureSockets.ticker(this.PAIR)) === null || _a === void 0 ? void 0 : _a.bestBid;
                var avgWeekPrice = this.futureSockets.averagePriceQuarter(this.PAIR);
                this.setDirection(this.bot.direction == 2 ? maxBuyPrice > avgWeekPrice : maxBuyPrice < avgWeekPrice);
            }
            else {
                this.setDirection(this.positionDirection);
            }
        }
    };
    FutureTrader.prototype.setDirection = function (direction) {
        this.bot.direction = direction;
        this.minFunc = direction ? Math.max : Math.min;
        this.maxFunc = direction ? Math.min : Math.max;
    };
    FutureTrader.prototype.add = function (operand1, operand2) {
        return this.bot.direction ?
            parseFloat(operand1) - parseFloat(operand2) :
            parseFloat(operand1) + parseFloat(operand2);
    };
    FutureTrader.prototype.sub = function (operand1, operand2) {
        return this.bot.direction ?
            parseFloat(operand1) + parseFloat(operand2) :
            parseFloat(operand1) - parseFloat(operand2);
    };
    FutureTrader.prototype.biggerThan = function (operand1, operand2) {
        return this.bot.direction ?
            operand1 < operand2 :
            operand1 > operand2;
    };
    FutureTrader.prototype.isFirst = function () {
        return !this.positionAmount;
    };
    FutureTrader.prototype.placeBuy = function () {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function () {
            var buyPrice, fbuyPrice, buyQu, fbuyQu, maxBuyPrice, balanceLeveraged, params;
            return __generator(this, function (_h) {
                switch (_h.label) {
                    case 0:
                        maxBuyPrice = (_a = this.futureSockets.ticker(this.PAIR)) === null || _a === void 0 ? void 0 : _a.bestBid;
                        balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;
                        params = {};
                        if (this.isFirst()) {
                            params.newClientOrderId = "FIRST" + this.PAIR;
                            fbuyPrice = maxBuyPrice * this.sub(1, this.bot.buy_percent);
                        }
                        else if (((_b = this.myLastOrder) === null || _b === void 0 ? void 0 : _b.side) == this.sellSide()) {
                            fbuyPrice = ((_c = this.myLastOrder) === null || _c === void 0 ? void 0 : _c.avgPrice) * this.sub(1, this.bot.take_profit);
                        }
                        else {
                            fbuyPrice = ((_d = this.myLastOrder) === null || _d === void 0 ? void 0 : _d.avgPrice) * this.sub(1, this.bot.last_distance);
                        }
                        buyPrice = this.minFunc(fbuyPrice, this.futureSockets.averagePrice(this.PAIR, this.bot.SMA), maxBuyPrice);
                        balanceLeveraged -= this.positionAmount * this.positionEntry;
                        if (this.isFirst()) {
                            buyQu = balanceLeveraged * this.bot.amount_percent * this.bot.increase_first / buyPrice;
                            this.error = true;
                        }
                        else if (((_e = this.myLastOrder) === null || _e === void 0 ? void 0 : _e.side) == this.sellSide()) {
                            buyQu = (_f = this.myLastOrder) === null || _f === void 0 ? void 0 : _f.executedQty;
                        }
                        else if ((_g = this.myLastOrder) === null || _g === void 0 ? void 0 : _g.isFirst()) {
                            buyQu = this.myLastOrder.executedQty / this.bot.increase_first;
                        }
                        else {
                            fbuyQu = this.myLastOrder.executedQty * (1 + this.bot.increase_factor);
                            buyQu = Math.max(fbuyQu, parseFloat(this.myLastOrder.executedQty.toString()) + parseFloat(this.filters.LOT_SIZE.stepSize));
                        }
                        if (!this.bot.multiassets) {
                            if (balanceLeveraged > 0) {
                                buyQu = Math.min(balanceLeveraged / buyPrice, buyQu);
                            }
                            else {
                                buyQu = 0;
                            }
                        }
                        Logger_1.BotLogger.instance.log({
                            type: "BeforeBuy - Future",
                            bot_id: this.bot._id,
                            fbuyPrice: fbuyPrice,
                            buyPrice: buyPrice,
                            fbuyQu: fbuyQu,
                            buyQu: buyQu,
                            maxBuyPrice: maxBuyPrice,
                            balance: this.balance[this.SECOND],
                            positionAmount: this.positionAmount,
                            positionEntry: this.positionEntry,
                            params: params,
                            balanceLeveraged: balanceLeveraged,
                            lastOrder: this.myLastOrder,
                            direction: this.bot.direction,
                            standingBuy: this.standingBuy,
                        });
                        return [4 /*yield*/, this.place_order(this.SECOND, Math.abs(buyQu), buyPrice, !this.bot.direction, params)];
                    case 1:
                        _h.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    FutureTrader.prototype.placeSell = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var maxBuyPrice, price, amount, SLprice;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        maxBuyPrice = (_a = this.futureSockets.ticker(this.PAIR)) === null || _a === void 0 ? void 0 : _a.bestBid;
                        amount = this.positionAmount;
                        if (this.standingBuy) {
                            price = this.positionEntry * this.add(1, this.bot.take_profit_position || this.bot.take_profit);
                        }
                        else {
                            price = this.positionEntry * this.add(1, this.bot.take_profit);
                        }
                        if (!(this.standingBuy && this.bot.sellAdded && this.standingBuy.executedQty < this.positionAmount)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.placeSellFromBuy(this.standingBuy, price)];
                    case 1:
                        amount = _b.sent();
                        _b.label = 2;
                    case 2:
                        if (!this.bot.callbackRate) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.place_order(this.PAIR, amount, 0, this.bot.direction, {
                                type: "TRAILING_STOP_MARKET",
                                activationPrice: this.roundPrice(this.maxFunc(price, maxBuyPrice)),
                                callbackRate: this.bot.callbackRate
                            })];
                    case 3:
                        _b.sent();
                        return [3 /*break*/, 6];
                    case 4: return [4 /*yield*/, this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                            type: "TAKE_PROFIT_MARKET",
                            stopPrice: this.roundPrice(this.maxFunc(price, maxBuyPrice)),
                            closePosition: true
                        })];
                    case 5:
                        _b.sent();
                        _b.label = 6;
                    case 6:
                        if (!this.bot.stop_loose) return [3 /*break*/, 8];
                        SLprice = this.sub(this.positionEntry, ((((this.balance[this.SECOND] * this.bot.stop_loose) + this.currentPnl) / this.positionAmount) * this.positionEntry));
                        if (!(SLprice > 0)) return [3 /*break*/, 8];
                        return [4 /*yield*/, this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                                type: "STOP_MARKET",
                                stopPrice: this.roundPrice(this.minFunc(SLprice, maxBuyPrice)),
                                closePosition: true
                            })];
                    case 7:
                        _b.sent();
                        _b.label = 8;
                    case 8:
                        if (!this.error) {
                            this.bot.lastOrder = Models_1.Bot.STABLE;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    FutureTrader.prototype.placeSellFromBuy = function (order, closePrice) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var maxBuyPrice, price;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        maxBuyPrice = (_a = this.futureSockets.ticker(this.PAIR)) === null || _a === void 0 ? void 0 : _a.bestBid;
                        price = this.maxFunc(order.price * this.add(1, this.bot.take_profit), maxBuyPrice * 1.001);
                        if (!(this.biggerThan(closePrice, price) && ( /*this instanceof DualBot ||*/!order.isFirst()))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.place_order(this.PAIR, order.executedQty, price, this.bot.direction, {
                                newClientOrderId: "SELL" + order.orderId
                            })];
                    case 1:
                        _b.sent();
                        return [2 /*return*/, this.positionAmount - order.executedQty];
                    case 2: return [2 /*return*/, this.positionAmount];
                }
            });
        });
    };
    FutureTrader.prototype.isEmptyObject = function (obj) {
        return !!obj && Object.keys(obj).length === 0 && obj.constructor === Object;
    };
    return FutureTrader;
}(BasePlacer_1.BasePlacer));
exports.FutureTrader = FutureTrader;
