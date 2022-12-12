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
exports.OrderPlacer = void 0;
var BasePlacer_1 = require("./BasePlacer");
var Models_1 = require("../Models");
var OrderPlacer = /** @class */ (function (_super) {
    __extends(OrderPlacer, _super);
    function OrderPlacer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OrderPlacer.prototype.place = function () {
        return __awaiter(this, void 0, void 0, function () {
            var calculations;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.binance || !this.balance[this.FIRST] || !this.orders || !this.sockets.prices[this.PAIR] || !this.sockets.orderBooks[this.PAIR])
                            return [2 /*return*/];
                        this.parseAllValues();
                        this.buildHistory();
                        calculations = this.calculatePrice();
                        this.buyBNB();
                        return [4 /*yield*/, this.split(this.bot.divide_buy, this.FIRST, calculations.buyPrice, calculations.buyQu, true, this.bot.diffrent_buy)];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.split(this.bot.divide_sell, this.SECOND, calculations.sellPrice, calculations.sellQu, false, this.bot.diffrent_sell)];
                    case 2:
                        _a.sent();
                        if (!this.error) {
                            this.bot.status = Models_1.BotStatus.STABLE;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    OrderPlacer.prototype.calculatePrice = function () {
        var maxBuyPrice = Object.keys(this.sockets.orderBooks[this.PAIR].bids)[0];
        var minSellPrice = Object.keys(this.sockets.orderBooks[this.PAIR].asks)[0];
        var buyPrice = this.bot.buy_side == 'sell' ? minSellPrice : maxBuyPrice;
        buyPrice *= (1 - this.bot.buy_percent);
        var sellPrice = this.bot.sell_side == 'sell' ? minSellPrice : maxBuyPrice;
        sellPrice *= (1 + this.bot.sell_percent);
        this.distanceTimestamp = new Date().getTime() - (this.bot.last_distance_minutes * 60 * 1000);
        if (this.lastBuy) {
            var myLastBuyPrice = this.lastBuy.price;
            if (this.lastBuy.time > this.distanceTimestamp && (!this.lastSell || this.lastSell.time < this.lastSell.time)) {
                buyPrice = Math.min(buyPrice, myLastBuyPrice * (1 - this.bot.last_distance));
            }
            if (this.bot.last_buy_dist && this.lastBuy.price > 0) {
                var last_buy = this.lastBuy.price * this.bot.last_buy_dist;
                sellPrice = Math.min(last_buy, sellPrice);
            }
            if (this.bot.stop_loose && myLastBuyPrice > 0) {
                if (minSellPrice < myLastBuyPrice * (1 - this.bot.stop_loose)) {
                    sellPrice = minSellPrice;
                }
            }
        }
        if (this.lastSell) {
            if (this.lastSell.time > this.distanceTimestamp && (!this.lastBuy || this.lastSell.time > this.lastSell.time)) {
                sellPrice = Math.max(sellPrice, this.lastSell.price * (1 + this.bot.last_distance));
            }
        }
        maxBuyPrice = Math.min(maxBuyPrice, this.sockets.averagePrice(this.PAIR, this.bot.SMA));
        minSellPrice = Math.max(minSellPrice, this.sockets.averagePrice(this.PAIR, this.bot.SMA));
        var buyQu = this.balance[this.SECOND].total * this.bot.amount_percent / buyPrice;
        var sellQu = this.balance[this.FIRST].total * this.bot.amount_percent_sell;
        return {
            buyQu: buyQu,
            sellQu: sellQu,
            sellPrice: sellPrice,
            buyPrice: buyPrice
        };
    };
    OrderPlacer.prototype.align = function (price, direction, qu) {
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
    OrderPlacer.prototype.split = function (divide, coin, price, qu, side, differnt) {
        return __awaiter(this, void 0, void 0, function () {
            var SIDE, tradesCount, _i, _a, trade, i;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (this.bot.increase_factor) {
                            SIDE = side ? 'BUY' : 'SELL';
                            tradesCount = 0;
                            for (_i = 0, _a = this.orders.filter(function (x) { var _a; return ((_a = x.status) === null || _a === void 0 ? void 0 : _a.includes('FILLED')) && x.time > _this.distanceTimestamp; }).reverse(); _i < _a.length; _i++) {
                                trade = _a[_i];
                                if (trade.side == SIDE) {
                                    tradesCount++;
                                }
                                else {
                                    break;
                                }
                            }
                            qu *= Math.pow(this.bot.increase_factor, tradesCount);
                        }
                        qu /= Math.pow(2, divide - 1);
                        i = 0;
                        _b.label = 1;
                    case 1:
                        if (!(i < divide)) return [3 /*break*/, 4];
                        return [4 /*yield*/, this.place_order(coin, qu, price, side)];
                    case 2:
                        _b.sent();
                        price = side ? price * (1 - differnt) : price * (1 + differnt);
                        qu *= 2;
                        _b.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    OrderPlacer.prototype.getAction = function (type) {
        return type ? this.binance.buy : this.binance.sell;
    };
    return OrderPlacer;
}(BasePlacer_1.BasePlacer));
exports.OrderPlacer = OrderPlacer;
