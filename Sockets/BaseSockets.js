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
exports.BaseSockets = void 0;
var Models_1 = require("../Models");
var Binance = require('node-binance-api');
var BaseSockets = /** @class */ (function () {
    function BaseSockets() {
        var _this = this;
        this.orderBooks = {};
        this.pairs = Array();
        this.prices = {};
        this.pricesQuarter = {};
        this.accounts = new Map();
        this.binance = Binance().options({});
        this.compare = function (arr1, arr2) {
            return !arr1.filter(function (i) { return arr2.indexOf(i) == -1; }).length && !arr2.filter(function (i) { return arr1.indexOf(i) == -1; }).length;
        };
        this.averagePrice = function (pair, steps) { return _this.prices[pair].slice(0, steps).reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }, 0) / steps; };
        this.averagePriceQuarter = function (pair) { return _this.pricesQuarter[pair].reduce(function (a, b) { return parseFloat(a) + parseFloat(b); }, 0) / _this.prices[pair].length; };
    }
    BaseSockets.prototype.updateDepthSockets = function () {
        var _this = this;
        if (this.depthCacheSocket)
            this.binance.websockets.terminate(this.depthCacheSocket);
        this.depthCacheSocket = this.binance.websockets.depthCache(this.pairs, function (symbol, depth) {
            if (!_this.orderBooks[symbol])
                _this.orderBooks[symbol] = {};
            _this.orderBooks[symbol].bids = _this.binance.sortBids(depth.bids);
            _this.orderBooks[symbol].asks = _this.binance.sortAsks(depth.asks);
        });
    };
    BaseSockets.prototype.updatePricesSockets = function () {
        var _this = this;
        if (this.chartsSocket)
            this.binance.futuresTerminate(this.chartsSocket);
        this.chartsSocket = this.binance.futuresChart(this.pairs, "5m", function (symbol, interval, chart) {
            return _this.prices[symbol] = Object.values(chart).map(function (c) { return c.close; }).reverse();
        });
        this.chartsSocket = this.binance.futuresChart(this.pairs, "15m", function (symbol, interval, chart) {
            return _this.pricesQuarter[symbol] = Object.values(chart).map(function (c) { return c.close; }).reverse();
        });
    };
    BaseSockets.prototype.updateBalancesSockets = function (bots, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var newKeys, _loop_1, this_1, _i, newKeys_1, k, _a, _b, b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        newKeys = bots.map(function (b) { return b.key_id; });
                        _loop_1 = function (k) {
                            var keyFound, acc;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        if (!!this_1.accounts[k]) return [3 /*break*/, 2];
                                        keyFound = keys.find(function (kk) { return kk._id.toString() == k; });
                                        this_1.accounts[k] = new Models_1.Account(Binance().options({
                                            APIKEY: keyFound.public,
                                            APISECRET: keyFound.secret
                                        }));
                                        acc = this_1.accounts[k];
                                        this_1.addUserDataSockets(acc);
                                        return [4 /*yield*/, this_1.timeout(500)];
                                    case 1:
                                        _d.sent();
                                        _d.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _i = 0, newKeys_1 = newKeys;
                        _c.label = 1;
                    case 1:
                        if (!(_i < newKeys_1.length)) return [3 /*break*/, 4];
                        k = newKeys_1[_i];
                        return [5 /*yield**/, _loop_1(k)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        for (_a = 0, _b = Object.values(bots); _a < _b.length; _a++) {
                            b = _b[_a];
                            if (!b.binance) {
                                b.binance = this.accounts[b.key_id];
                            }
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    BaseSockets.prototype.isPairsChanged = function (bots) {
        var botsPairs = bots.map(function (b) { return b.coin1 + b.coin2; });
        botsPairs = botsPairs.concat(bots
            .map(function (_a) {
            var signalings = _a.signalings;
            return signalings || [];
        })
            .map(function (s) { return s.map(function (_a) {
            var coin1 = _a.coin1, coin2 = _a.coin2;
            return coin1 + coin2;
        }); })
            .reduce(function (a, c) { return a.concat(c); }, []));
        botsPairs = Array.from(new Set(botsPairs));
        if (!this.compare(botsPairs, this.pairs)) {
            this.pairs = botsPairs;
            return true;
        }
    };
    BaseSockets.prototype.timeout = function (ms) {
        return new Promise(function (resolve) { return setTimeout(resolve, ms); });
    };
    return BaseSockets;
}());
exports.BaseSockets = BaseSockets;
