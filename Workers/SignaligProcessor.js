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
exports.SignalingPlacer = exports.SignaligProcessor = exports.GroupCode = void 0;
var mongodb_1 = require("mongodb");
var DAL_1 = require("../DAL");
var Models_1 = require("../Models");
var FuturesTrader_1 = require("./FuturesTrader");
var cancelOrders = require('../CancelOrders');
var SIGNALING_REGEXES = [
    '⚡️⚡️ #(.*)\/(.*) ⚡️⚡️\nExchanges: Binance (.*)\nSignal Type: Regular \\((.*)\\)\nLeverage: Cross \\((.*)X\\)\n+Deposit only (.*)\%\n\nEntry Targets:\n((?:\\d\\).*\n)+)\nTake-Profit Targets:\n((?:\\d\\).*\n)+)\nStop Targets:\n((?:\\d\\).*\n)+)',
    '📦#(.*)\/(.*)-(.*)🔦(.*)IDEA(.*)🪤Maxleveragerecommended:(.*)✓ENTRY:-(.*)-(.*)💵Target1:(.*)💵Target2:(.*)💵Target3:(.*)💵Target4:(.*)💵Target5:(.*)💵Target6:(.*)🪄Stop\\|Loss:(.*)'
];
var GroupCode = /** @class */ (function () {
    function GroupCode() {
    }
    GroupCode.EDITING_GROUP = -1001596116968;
    GroupCode.MIDDLEWARE_GROUP = -1001548647054;
    GroupCode.SPOT_GROUP = -1001799305610;
    return GroupCode;
}());
exports.GroupCode = GroupCode;
var SignaligProcessor = /** @class */ (function () {
    function SignaligProcessor() {
        this.bots = new Array();
    }
    SignaligProcessor.prototype.proccessTextSignal = function (message) {
        for (var _i = 0, SIGNALING_REGEXES_1 = SIGNALING_REGEXES; _i < SIGNALING_REGEXES_1.length; _i++) {
            var regex = SIGNALING_REGEXES_1[_i];
            var match = message.replace(/\s/g, '').match(regex);
            if (match) {
                var s = new Models_1.Signaling();
                s._id = new mongodb_1.ObjectId();
                var lev = void 0, enter1 = void 0, enter2 = void 0;
                s.coin1 = match[1], s.coin2 = match[2], s.direction = match[4], lev = match[6], enter1 = match[7], enter2 = match[8];
                s.enter = [parseFloat(enter1), parseFloat(enter2)];
                s.takeProfits = match.slice(9, 15).map(function (x) { return parseFloat(x); });
                s.stop = parseFloat(match[15]);
                s.lervrage = parseInt(lev);
                s.direction = s.direction == "Bullish" ? "LONG" : "SHORT";
                console.log(s);
                this.placeOrders(s);
            }
        }
    };
    SignaligProcessor.prototype.placeOrders = function (signaling) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var _i, _b, bot;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _i = 0, _b = this.bots;
                        _c.label = 1;
                    case 1:
                        if (!(_i < _b.length)) return [3 /*break*/, 4];
                        bot = _b[_i];
                        return [4 /*yield*/, DAL_1.DAL.instance.addSignaling(bot, signaling)];
                    case 2:
                        _c.sent();
                        (_a = bot.binance) === null || _a === void 0 ? void 0 : _a.orders.changed.push(signaling.coin1 + signaling.coin2 + bot.positionSide());
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SignaligProcessor.prototype.setBots = function (bots) {
        this.bots = bots;
    };
    SignaligProcessor.instance = new SignaligProcessor();
    return SignaligProcessor;
}());
exports.SignaligProcessor = SignaligProcessor;
var SignalingPlacer = /** @class */ (function (_super) {
    __extends(SignalingPlacer, _super);
    function SignalingPlacer(bot, e) {
        var _this = this;
        bot.coin1 = "BTC";
        bot.coin2 = "USDT";
        _this = _super.call(this, bot, e) || this;
        _this.allExchangeInfo = e;
        return _this;
    }
    SignalingPlacer.prototype.place = function () {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var _i, _d, signaling;
            var _this = this;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _i = 0, _d = (_a = this.bot.signalings) !== null && _a !== void 0 ? _a : [];
                        _e.label = 1;
                    case 1:
                        if (!(_i < _d.length)) return [3 /*break*/, 6];
                        signaling = _d[_i];
                        this.PAIR = signaling.coin1 + signaling.coin2;
                        if (!this.futureSockets.prices[this.PAIR])
                            return [3 /*break*/, 5];
                        if (!this.bot.binance.orders.changed.includes(this.PAIR + this.bot.positionSide()))
                            return [3 /*break*/, 5];
                        this.bot.binance.orders.changed = this.bot.binance.orders.changed.filter(function (x) { return x != _this.PAIR; });
                        this.bot.direction = signaling.direction != "LONG";
                        this.orders = (_c = (_b = this.bot.binance) === null || _b === void 0 ? void 0 : _b.orders[this.PAIR]) !== null && _c !== void 0 ? _c : [];
                        this.exchangeInfo = this.allExchangeInfo.symbols.find(function (s) { return s.symbol == _this.PAIR; });
                        this.filters = this.exchangeInfo.filters.reduce(function (a, b) { a[b.filterType] = b; return a; }, {});
                        cancelOrders(this.bot, this.PAIR);
                        this.buildHistory();
                        this.calculatePrice();
                        if (!(new Date().getTime() - signaling.date.getTime() > 1000 * 60 * 60 * 24 * 3)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.closePosition(signaling)];
                    case 2:
                        _e.sent();
                        return [3 /*break*/, 5];
                    case 3: return [4 /*yield*/, this.placeOrder(signaling)];
                    case 4:
                        _e.sent();
                        _e.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    SignalingPlacer.prototype.closePosition = function (signaling) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        DAL_1.DAL.instance.removeSignaling(this.bot, signaling);
                        if (!(this.positionAmount != 0)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                                stopPrice: this.roundPrice(this.futureSockets.prices[this.PAIR][0] * (this.bot.direction ? 1.001 : 0.999)),
                                type: "STOP_MARKET",
                                closePosition: true
                            })];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    SignalingPlacer.prototype.placeOrder = function (signaling) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function () {
            var price, qu, price, qu;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        if (!!((_a = this.myLastOrder) === null || _a === void 0 ? void 0 : _a.clientOrderId.includes(signaling._id))) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.closePosition(signaling)];
                    case 1:
                        _d.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        if ((_b = this.myLastOrder) === null || _b === void 0 ? void 0 : _b.clientOrderId.includes("LAST")) {
                            DAL_1.DAL.instance.removeSignaling(this.bot, signaling);
                            this.bot.lastOrder = Models_1.Bot.STABLE;
                            return [2 /*return*/];
                        }
                        _d.label = 3;
                    case 3:
                        if (this.isFirst()) {
                            price = this.roundPrice(this.minFunc(signaling.enter[0], this.futureSockets.prices[this.PAIR][0]));
                            qu = 11 / price;
                            this.place_order(this.PAIR, qu, price, !this.bot.direction, {
                                newClientOrderId: "FIRST" + signaling._id
                            });
                        }
                        else {
                            if (((_c = this.myLastOrder) === null || _c === void 0 ? void 0 : _c.side) == this.buySide()) {
                                price = this.roundPrice(signaling.enter[1]);
                                qu = 11 / price;
                                this.place_order(this.PAIR, qu, price, !this.bot.direction, {});
                                this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                                    type: "TAKE_PROFIT_MARKET",
                                    closePosition: true,
                                    stopPrice: signaling.takeProfits[0],
                                    newClientOrderId: "LASTTP" + signaling._id
                                });
                                this.place_order(this.PAIR, 0, 0, this.bot.direction, {
                                    type: "STOP_MARKET",
                                    closePosition: true,
                                    stopPrice: signaling.stop,
                                    newClientOrderId: "LASTSL" + signaling._id
                                });
                            }
                        }
                        this.bot.lastOrder = Models_1.Bot.STABLE;
                        return [2 /*return*/];
                }
            });
        });
    };
    return SignalingPlacer;
}(FuturesTrader_1.FutureTrader));
exports.SignalingPlacer = SignalingPlacer;
