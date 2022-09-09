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
exports.WeightAvg = void 0;
var BasePlacer_1 = require("./BasePlacer");
var Models_1 = require("../Models");
var WeightAvg = /** @class */ (function (_super) {
    __extends(WeightAvg, _super);
    function WeightAvg() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.myLastBuyCount = 0;
        return _this;
    }
    WeightAvg.prototype.place = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.binance || !this.balance[this.SECOND] || !this.orders.length || !this.sockets.prices[this.PAIR] || !this.sockets.orderBooks[this.PAIR])
                            return [2 /*return*/];
                        this.parseAllValues();
                        return [4 /*yield*/, this.buyBNB()];
                    case 1:
                        _b.sent();
                        this.buildHistory();
                        // this.isFirst && console.log("FIRST")
                        return [4 /*yield*/, this.placeBuy()];
                    case 2:
                        // this.isFirst && console.log("FIRST")
                        _b.sent();
                        _a = !this.isFirst;
                        if (!_a) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.placeSell()];
                    case 3:
                        _a = (_b.sent());
                        _b.label = 4;
                    case 4:
                        _a;
                        return [2 /*return*/];
                }
            });
        });
    };
    Object.defineProperty(WeightAvg.prototype, "isFirst", {
        get: function () {
            var maxBuyPrice = parseFloat(Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0]);
            return this.balance[this.FIRST].total < (this.filters.MIN_NOTIONAL.minNotional / maxBuyPrice);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WeightAvg.prototype, "isLast", {
        get: function () {
            return this.balance[this.SECOND].total < (this.filters.MIN_NOTIONAL.minNotional);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(WeightAvg.prototype, "isNewAlgo", {
        get: function () {
            return this.bot.take_profit_position == -1;
        },
        enumerable: false,
        configurable: true
    });
    WeightAvg.prototype.placeBuy = function () {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function () {
            var buyPrice, buyQu, maxBuyPrice, params;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        maxBuyPrice = Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0];
                        params = {};
                        buyPrice = maxBuyPrice * (1 - this.bot.buy_percent);
                        if (this.isFirst || !this.myLastOrder) {
                            params.newClientOrderId = "FIRST" + this.PAIR;
                        }
                        else if (this.isNewAlgo && this.myLastBuy && this.myLastOrder.side == this.sellSide()) {
                            buyPrice = (_a = this.myLastBuy) === null || _a === void 0 ? void 0 : _a.price;
                        }
                        else if (this.myLastOrder.side == this.sellSide()) {
                            buyPrice = Math.min(this.myLastOrder.price * (1 - this.bot.take_profit), buyPrice);
                        }
                        else {
                            buyPrice = Math.min(this.myLastOrder.price * (1 - this.bot.last_distance), buyPrice);
                        }
                        if (this.bot.SMA) {
                            buyPrice = Math.min(buyPrice, this.sockets.averagePrice(this.PAIR, this.bot.SMA));
                        }
                        if (this.isFirst || !this.myLastOrder) {
                            buyQu = this.balance[this.SECOND].available * this.bot.amount_percent / buyPrice;
                        }
                        else if (this.isNewAlgo && this.myLastBuy && ((_b = this.myLastBuy) === null || _b === void 0 ? void 0 : _b.orderId) != this.myLastOrder.orderId) {
                            buyQu = (_c = this.myLastBuy) === null || _c === void 0 ? void 0 : _c.origQty;
                        }
                        else if (((_d = this.myLastOrder) === null || _d === void 0 ? void 0 : _d.side) == this.sellSide()) {
                            buyQu = this.myLastOrder.executedQty;
                        }
                        else {
                            buyQu = this.myLastOrder.origQty * (1 + this.bot.increase_factor);
                        }
                        buyQu = Math.min(this.balance[this.SECOND].available / buyPrice, buyQu);
                        return [4 /*yield*/, this.place_order(this.SECOND, buyQu, buyPrice, true, params)];
                    case 1:
                        _e.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    WeightAvg.prototype.placeSell = function () {
        return __awaiter(this, void 0, void 0, function () {
            var sellPrice, sellQu, minSellPrice;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sellQu = 0;
                        if (!this.standingBuy) return [3 /*break*/, 13];
                        if (!(this.oldestStandingBuy && this.oldestStandingBuy.orderId != this.standingBuy.orderId && this.isNewAlgo)) return [3 /*break*/, 5];
                        if (!this.isLast) return [3 /*break*/, 1];
                        sellPrice = this.standingBuy.price * (1 + this.bot.take_profit);
                        return [3 /*break*/, 3];
                    case 1:
                        sellPrice = this.weightAverage([this.standingBuy, this.oldestStandingBuy]) * (1 + this.bot.take_profit);
                        return [4 /*yield*/, this.place_order(this.FIRST, this.oldestStandingBuy.executedQty, sellPrice, false, {
                                newClientOrderId: "SELL" + this.oldestStandingBuy.orderId
                            }, true)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3: return [4 /*yield*/, this.place_order(this.FIRST, this.standingBuy.executedQty, sellPrice, false, {
                            newClientOrderId: "SELL" + this.standingBuy.orderId
                        })];
                    case 4:
                        _a.sent();
                        return [3 /*break*/, 10];
                    case 5:
                        sellPrice = this.standingBuy.price * (1 + this.bot.take_profit);
                        sellQu = this.standingBuy.executedQty;
                        if (!(sellQu < this.balance[this.FIRST].available)) return [3 /*break*/, 7];
                        return [4 /*yield*/, this.place_order(this.FIRST, sellQu, sellPrice, false, {
                                newClientOrderId: "SELL" + this.standingBuy.orderId
                            })];
                    case 6:
                        _a.sent();
                        return [3 /*break*/, 8];
                    case 7:
                        sellQu = 0;
                        _a.label = 8;
                    case 8:
                        sellPrice = this.myLastBuyAvg * (1 + (this.bot.take_profit_position || this.bot.take_profit));
                        return [4 /*yield*/, this.place_order(this.FIRST, this.balance[this.FIRST].available - sellQu, sellPrice, false)];
                    case 9:
                        _a.sent();
                        _a.label = 10;
                    case 10:
                        if (!this.bot.stop_loose) return [3 /*break*/, 12];
                        sellPrice = this.myLastBuyAvg * (1 - this.bot.stop_loose);
                        return [4 /*yield*/, this.place_order(this.FIRST, this.balance[this.FIRST].available, sellPrice, false, {
                                type: "STOP_LOSS_LIMIT",
                                stopPrice: this.roundPrice(sellPrice)
                            })];
                    case 11:
                        _a.sent();
                        _a.label = 12;
                    case 12: return [3 /*break*/, 15];
                    case 13:
                        minSellPrice = parseFloat(Object.keys(this.sockets.orderBooks[this.PAIR].asks)[0]);
                        return [4 /*yield*/, this.place_order(this.FIRST, this.balance[this.FIRST].available, minSellPrice, false)];
                    case 14:
                        _a.sent();
                        _a.label = 15;
                    case 15:
                        if (!this.error) {
                            this.bot.lastOrder = Models_1.Bot.STABLE;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    WeightAvg.prototype.buyBNB = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var bnbPair, e_1;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!(this.bot.minbnb && this.balance["BNB"] && this.balance["BNB"].available < this.bot.minbnb && !this.PAIR.includes('BNB'))) return [3 /*break*/, 4];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        bnbPair = ((_a = this.exchangeInfo.symbols) === null || _a === void 0 ? void 0 : _a.find(function (s) { return s.symbol == 'BNB' + _this.SECOND; })) ? 'BNB' + this.SECOND : this.FIRST + 'BNB';
                        return [4 /*yield*/, this.binance.marketBuy(bnbPair, this.bot.bnbamount)];
                    case 2:
                        _b.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _b.sent();
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    WeightAvg.prototype.getAction = function (type) {
        return type ? this.binance.buy : this.binance.sell;
    };
    return WeightAvg;
}(BasePlacer_1.BasePlacer));
exports.WeightAvg = WeightAvg;
