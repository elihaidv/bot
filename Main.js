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
var Binance = require('node-binance-api');
require('dotenv').config({ path: '../.env' });
var cancelOrders = require('./CancelOrders');
var DirectionTrader_1 = require("./Workers/DirectionTrader");
var DualBot_1 = require("./Workers/DualBot");
var FuturesTrader_1 = require("./Workers/FuturesTrader");
var Models_1 = require("./Models");
// import { OrderPlacer } from './PlaceOrders';
var Sockets_1 = require("./Sockets/Sockets");
var SocketsFuture_1 = require("./Sockets/SocketsFuture");
var WeightAvg_1 = require("./Workers/WeightAvg");
var DAL_1 = require("./DAL");
var Periodically_1 = require("./Workers/Periodically");
var exchangeInfo, futuresExchangeInfo;
var bots = new Array();
function run() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    Binance().exchangeInfo().then(function (data) { return exchangeInfo = data; });
                    Binance().futuresExchangeInfo().then(function (data) { return futuresExchangeInfo = data; });
                    return [4 /*yield*/, DAL_1.DAL.instance.init()];
                case 1:
                    _a.sent();
                    execute();
                    return [2 /*return*/];
            }
        });
    });
}
run();
function execute() {
    return __awaiter(this, void 0, void 0, function () {
        var botsResults, keys, outdatedBots, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 7, , 8]);
                    return [4 /*yield*/, DAL_1.DAL.instance.getBots()];
                case 1:
                    botsResults = _a.sent();
                    return [4 /*yield*/, DAL_1.DAL.instance.getKeys()];
                case 2:
                    keys = _a.sent();
                    initBots(botsResults);
                    Sockets_1.Sockets.getInstance().updateSockets(Array.from(bots.filter(function (b) { return !b.isFuture; })), keys);
                    SocketsFuture_1.SocketsFutures.getFInstance().updateSockets(Array.from(bots.filter(function (b) { return b.isFuture; })), keys);
                    outdatedBots = filterOutdated(bots);
                    if (!(exchangeInfo && futuresExchangeInfo)) return [3 /*break*/, 6];
                    return [4 /*yield*/, Promise.all(outdatedBots.map(cancelOrders))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, Sockets_1.Sockets.getInstance().timeout(1000)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, Promise.all(outdatedBots.map(function (b) {
                            switch (b.bot_type_id) {
                                // case "1":
                                //   return new OrderPlacer(b, exchangeInfo).place();
                                case "2":
                                    return new WeightAvg_1.WeightAvg(b, exchangeInfo).place();
                                case "3":
                                    return new FuturesTrader_1.FutureTrader(b, futuresExchangeInfo).place();
                                case "4":
                                    return new DualBot_1.DualBot(b, futuresExchangeInfo).place();
                                case "5":
                                    return new DirectionTrader_1.DirectionTrader(b, futuresExchangeInfo).place();
                                case "6":
                                    return new Periodically_1.Periodically(b, exchangeInfo).place();
                            }
                        }))];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    e_1 = _a.sent();
                    console.log(e_1);
                    return [3 /*break*/, 8];
                case 8:
                    setTimeout(execute, 3000);
                    return [2 /*return*/];
            }
        });
    });
}
function filterOutdated(bots) {
    return bots.filter(function (b) {
        var PAIR = b.coin1 + b.coin2 + b.positionSide();
        if (b.binance && b.binance.orders && b.binance.orders.changed.includes(PAIR)) {
            b.binance.orders.changed = b.binance.orders.changed.filter(function (p) { return p != PAIR; });
            return true;
        }
        if (b.lastOrder == Models_1.Bot.STABLE)
            return false;
        return !b.lastOrder || new Date().getTime() - b.lastOrder >= b.secound * 1000;
    });
}
function initBots(botsResults) {
    return __awaiter(this, void 0, void 0, function () {
        var newBots, _loop_1, _i, botsResults_1, bot;
        return __generator(this, function (_a) {
            newBots = new Array();
            _loop_1 = function (bot) {
                var oldBot = bots.find(function (b) { return b.id() == bot._id.toString(); });
                if (oldBot) {
                    newBots.push(Object.assign(oldBot, bot));
                }
                else {
                    newBots.push(Object.assign(new Models_1.Bot(), bot));
                }
            };
            for (_i = 0, botsResults_1 = botsResults; _i < botsResults_1.length; _i++) {
                bot = botsResults_1[_i];
                _loop_1(bot);
            }
            bots = newBots;
            return [2 /*return*/];
        });
    });
}
