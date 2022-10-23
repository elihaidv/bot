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
exports.OneStep = void 0;
var Models_1 = require("../Models");
var FuturesTrader_1 = require("./FuturesTrader");
var cancelOrders = require('../CancelOrders');
var OneStep = /** @class */ (function (_super) {
    __extends(OneStep, _super);
    function OneStep() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    OneStep.prototype.placeBuy = function () {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var buyQu, buyPrice, maxBuyPrice, balanceLeveraged;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.positionAmount) return [3 /*break*/, 2];
                        buyQu = void 0, buyPrice = void 0, maxBuyPrice = (_a = this.futureSockets.ticker(this.PAIR)) === null || _a === void 0 ? void 0 : _a.bestBid;
                        balanceLeveraged = this.balance[this.SECOND] * this.bot.leverage;
                        buyPrice = maxBuyPrice * this.sub(1, this.bot.buy_percent);
                        buyPrice = this.minFunc(buyPrice, this.futureSockets.averagePrice(this.PAIR, this.bot.SMA));
                        buyQu = balanceLeveraged * this.bot.amount_percent / buyPrice;
                        return [4 /*yield*/, this.place_order(this.SECOND, buyQu, buyPrice, !this.bot.direction, {})];
                    case 1:
                        _b.sent();
                        if (!this.error) {
                            this.bot.lastOrder = Models_1.Bot.STABLE;
                        }
                        _b.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    OneStep.prototype.placeSell = function () {
        return __awaiter(this, void 0, void 0, function () {
            var ticker, minSell;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        ticker = this.futureSockets.ticker(this.PAIR);
                        minSell = (this.bot.direction ? ticker === null || ticker === void 0 ? void 0 : ticker.bestAsk : ticker === null || ticker === void 0 ? void 0 : ticker.bestBid);
                        return [4 /*yield*/, this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                                type: "TAKE_PROFIT_MARKET",
                                stopPrice: this.roundPrice(this.maxFunc(minSell, this.positionEntry * this.add(1, this.bot.take_profit))),
                                closePosition: true
                            })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                                type: "STOP_MARKET",
                                stopPrice: this.roundPrice(this.minFunc(minSell, this.positionEntry * this.sub(1, this.bot.stop_loose))),
                                closePosition: true
                            })];
                    case 2:
                        _a.sent();
                        if (!this.error) {
                            this.bot.lastOrder = Models_1.Bot.STABLE;
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    OneStep.prototype.cancelOrders = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, cancelOrders(this.bot)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return OneStep;
}(FuturesTrader_1.FutureTrader));
exports.OneStep = OneStep;
