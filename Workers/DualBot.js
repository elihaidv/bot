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
exports.DualBot = void 0;
var FuturesTrader_1 = require("./FuturesTrader");
var Models_1 = require("../Models");
var DualBot = /** @class */ (function (_super) {
    __extends(DualBot, _super);
    function DualBot() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DualBot.prototype.placeBuy = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var maxBuyPrice, balanceLeveraged;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        maxBuyPrice = (_a = this.futureSockets.ticker(this.PAIR)) === null || _a === void 0 ? void 0 : _a.bestBid;
                        balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;
                        if (!!this.positionAmount) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.place_order(this.PAIR, (balanceLeveraged / maxBuyPrice) * this.bot.bigPosition, 0, !this.bot.direction, {
                                type: "MARKET",
                                positionSide: this.bot.positionSide(),
                                newClientOrderId: 'BigPosition' + this.bot.positionSide(),
                            })];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        _super.prototype.placeBuy.call(this);
                        return [2 /*return*/];
                }
            });
        });
    };
    DualBot.prototype.isFirst = function () {
        return !this.myLastOrder || !this.positionAmount;
    };
    DualBot.prototype.seekBigPosition = function () {
        var _this = this;
        for (var _i = 0, _a = this.orders
            .filter(function (x) { return x === null || x === void 0 ? void 0 : x.status.includes('FILLED'); })
            .filter(function (x) { return x.positionSide == _this.bot.positionSide(); })
            .reverse(); _i < _a.length; _i++) {
            var order = _a[_i];
            if (order.isBigPosition()) {
                this.bigPosition = order;
                break;
            }
        }
    };
    DualBot.prototype.findStandbyBuy = function () {
        var _this = this;
        var sellOrders = [];
        for (var _i = 0, _a = this.orders
            .filter(function (x) { return x === null || x === void 0 ? void 0 : x.status.includes('FILLED'); })
            .filter(function (x) { return x.positionSide == _this.bot.positionSide(); })
            .reverse(); _i < _a.length; _i++) {
            var order = _a[_i];
            if (order.isBigPosition()) {
                break;
            }
            if (order.side == this.sellSide()) {
                sellOrders.push(order.clientOrderId);
            }
            else if (!sellOrders.includes("SELL" + order.orderId)) {
                return order;
            }
        }
    };
    DualBot.prototype.buyLastSell = function () {
        return !!this.findStandbyBuy();
    };
    DualBot.prototype.placeSell = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var maxBuyPrice, price, lastStandbyBuy;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        maxBuyPrice = (_a = this.futureSockets.ticker(this.PAIR)) === null || _a === void 0 ? void 0 : _a.bestBid;
                        this.seekBigPosition();
                        price = this.bigPosition.avgPrice * this.add(1, this.bot.take_profit_position);
                        lastStandbyBuy = this.findStandbyBuy();
                        if (!this.myLastOrder) return [3 /*break*/, 3];
                        if (!(this.myLastOrder.executedQty < this.positionAmount)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.placeSellFromBuy(this.myLastOrder, price)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2: return [3 /*break*/, 5];
                    case 3:
                        if (!(lastStandbyBuy && this.bot.sellAdded)) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.placeSellFromBuy(lastStandbyBuy, price)];
                    case 4:
                        _b.sent();
                        _b.label = 5;
                    case 5: return [4 /*yield*/, this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                            type: "TAKE_PROFIT_MARKET",
                            stopPrice: this.roundPrice(this.maxFunc(price, maxBuyPrice)),
                            closePosition: true,
                            positionSide: this.bot.direction ? 'SHORT' : 'LONG'
                        })];
                    case 6:
                        _b.sent();
                        price = this.bigPosition.avgPrice * this.sub(1, this.bot.take_profit_position);
                        return [4 /*yield*/, this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                                type: "STOP_MARKET",
                                stopPrice: this.roundPrice(this.minFunc(price, maxBuyPrice)),
                                closePosition: true,
                                positionSide: this.bot.direction ? 'SHORT' : 'LONG'
                            })];
                    case 7:
                        _b.sent();
                        if (!this.error) {
                            this.bot.status = Models_1.BotStatus.STABLE;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    return DualBot;
}(FuturesTrader_1.FutureTrader));
exports.DualBot = DualBot;
