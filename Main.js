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
var SignaligProcessor_1 = require("./Workers/SignaligProcessor");
var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');
var http = require('http');
var fs = require('fs');
var telegram_1 = require("telegram");
var sessions_1 = require("telegram/sessions");
var events_1 = require("telegram/events");
var OneStep_1 = require("./Workers/OneStep");
var PlaceOrders_1 = require("./Workers/PlaceOrders");
var Logger_1 = require("./Logger");
var coralogix_logger_1 = require("coralogix-logger");
var exchangeInfo, futuresExchangeInfo, first = true;
var bots = new Array();
function run() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    Binance().exchangeInfo().then(function (data) { return exchangeInfo = data; });
                    Binance().futuresExchangeInfo().then(function (data) {
                        futuresExchangeInfo = data;
                        SignaligProcessor_1.SignaligProcessor.instance.futuresExchangeInfo = data;
                        console.log("futuresExchangeInfo loaded");
                    });
                    return [4 /*yield*/, DAL_1.DAL.instance.init()];
                case 1:
                    _a.sent();
                    execute();
                    createServer();
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
                    SignaligProcessor_1.SignaligProcessor.instance.setBots(Array.from(bots.filter(function (b) { return b.bot_type_id == "7"; })));
                    outdatedBots = filterOutdated(bots);
                    if (!(exchangeInfo && futuresExchangeInfo)) return [3 /*break*/, 6];
                    if (first) {
                        bots.filter(function (b) { return b.bot_type_id == "7"; }).forEach(function (b) {
                            return b.signalings.forEach(function (s) { var _a; return (_a = b.binance) === null || _a === void 0 ? void 0 : _a.orders.changed.push(s.coin1 + s.coin2 + b.positionSide()); });
                        });
                        first = false;
                    }
                    return [4 /*yield*/, Promise.all(outdatedBots.filter(function (b) { return !b.avoidCancel; }).map(function (b) { return cancelOrders(b); }))];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, Sockets_1.Sockets.getInstance().timeout(1000)];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, Promise.all(outdatedBots.map(function (b) {
                            switch (b.bot_type_id) {
                                case "1":
                                    return new PlaceOrders_1.OrderPlacer(b, exchangeInfo).place();
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
                                case "7":
                                    return new SignaligProcessor_1.SignalingPlacer(b, futuresExchangeInfo).place();
                                case "8":
                                    return new OneStep_1.OneStep(b, futuresExchangeInfo).place();
                            }
                        }))];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6: return [3 /*break*/, 8];
                case 7:
                    e_1 = _a.sent();
                    console.log(e_1);
                    Logger_1.BotLogger.instance.log({
                        type: "GeneralError",
                        message: (e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1,
                    }, coralogix_logger_1.Severity.error);
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
        if (b.signalings && b.binance && b.binance.orders && b.status != Models_1.BotStatus.ERROR) {
            for (var _i = 0, _a = b.signalings; _i < _a.length; _i++) {
                var s = _a[_i];
                if (b.binance.orders.changed.includes(s.coin1 + s.coin2 + b.positionSide())) {
                    return true;
                }
            }
        }
        if (b.status == Models_1.BotStatus.STABLE)
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
function createServer() {
    return __awaiter(this, void 0, void 0, function () {
        var apiId, apiHash, stringSession, client;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    apiId = 708720;
                    apiHash = "1e6f98056d5a7f5c6508b1a38478eb54";
                    stringSession = new sessions_1.StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAUHIwmGyneJ1D1vODLBkJrLEI5uUPZ1W44dIsC/BY4d3vevWJXuaxQSgPZ6qpIqRUNx24dZEqEoS0oXDqDul7lVs2D89H7FYjUQgG/w9gLNP/BZmi5e3w4m3AGRI98o5SmDe8iO0LTIph8DwRfLowvChTksrhLeMUyBTgoriOFTnECbeptxDWhWuspFdHX6wEjKcRw7ce08atTH427f1a53MjZqZnvTPcSX5BZcecoWcHu5HqjVG40xsVzMSJC+I7uYL+CIhOvquH+o956Vb78qhTWQeBz0k8pwj0qLXLMtGPkoocEDLcr/DYEK06syUlb3x+IPsPW5d2q9PTsORJVsA=");
                    client = new telegram_1.TelegramClient(stringSession, apiId, apiHash, {
                        connectionRetries: 5,
                    });
                    return [4 /*yield*/, client.start({
                            phoneNumber: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ""];
                            }); }); },
                            password: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ""];
                            }); }); },
                            phoneCode: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ""];
                            }); }); },
                            onError: function (err) { return console.log(err); },
                        })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, client.addEventHandler(function (m) {
                            SignaligProcessor_1.SignaligProcessor.instance.proccessTextSignal(m.message.text);
                            // console.log(JSON.stringify(m.message.text))
                        }, new events_1.NewMessage({}))];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
