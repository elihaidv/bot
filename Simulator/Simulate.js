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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var DirectionTrader_1 = require("../Workers/DirectionTrader");
var DualBot_1 = require("../Workers/DualBot");
var FuturesTrader_1 = require("../Workers/FuturesTrader");
var Models_1 = require("../Models");
var WeightAvg_1 = require("../Workers/WeightAvg");
var DataManager_1 = require("./DataManager");
var FutureDataManager_1 = require("./FutureDataManager");
var process_1 = require("process");
var DALSimulation_1 = require("../DALSimulation");
var Periodically_1 = require("../Workers/Periodically");
var exchangeInfo_json_1 = __importDefault(require("./exchangeInfo.json"));
var cf = require('node-fetch-cache');
var fetch = cf.fetchBuilder.withCache(new cf.FileSystemCache({
    cacheDirectory: '/tmp/simcache',
}));
var OneStep_1 = require("../Workers/OneStep");
var Binance = require('node-binance-api');
var PlaceOrders_1 = require("../Workers/PlaceOrders");
console.log(process.argv);
var id = process.argv[3] || "61da8b2036520f0737301999";
var dataManager;
function run() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var simulation, bot, _b, _c, _d, start, end, endChunk, t, ToPlace, ordersToFill, startChunk, endChunk_1, o, _e;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, fetch("https://itamars.live/api/simulations/" + id, {
                        headers: {
                            "API-KEY": "WkqrHeuts2mIOJHMcxoK"
                        }
                    }).then(function (r) { return r.json(); })];
                case 1:
                    simulation = _f.sent();
                    bot = Object.assign(new Models_1.Bot(), simulation);
                    if (simulation.variations) {
                        Object.assign(bot, simulation.variations[(_a = process_1.env.CLOUD_RUN_TASK_INDEX) !== null && _a !== void 0 ? _a : 0]);
                    }
                    dataManager = bot.isFuture ? new FutureDataManager_1.FutureDataManager(bot) : new DataManager_1.DataManager(bot);
                    _c = (_b = dataManager).setExchangeInfo;
                    if (!bot.isFuture) return [3 /*break*/, 2];
                    _d = exchangeInfo_json_1.default;
                    return [3 /*break*/, 4];
                case 2: return [4 /*yield*/, Binance({ 'family': 4 }).exchangeInfo()];
                case 3:
                    _d = _f.sent();
                    _f.label = 4;
                case 4:
                    _c.apply(_b, [_d]);
                    DALSimulation_1.DAL.instance.init(dataManager, id);
                    start = new Date(process.argv[4]).getTime() - (bot.longSMA * 15 * 60 * 1000);
                    end = new Date(process.argv[5]).getTime();
                    endChunk = Math.min(end, start + dataManager.MIN_CHART_SIZE * 1000);
                    return [4 /*yield*/, dataManager.fetchAllCharts(start, endChunk)];
                case 5:
                    _f.sent();
                    dataManager.currentCandle = (bot.longSMA * 15 * 60);
                    dataManager.initData();
                    return [4 /*yield*/, place(bot)];
                case 6:
                    _f.sent();
                    t = dataManager.chart[dataManager.currentCandle];
                    _f.label = 7;
                case 7:
                    if (!(t && t.time <= end)) return [3 /*break*/, 14];
                    ToPlace = false;
                    ordersToFill = dataManager.checkOrder(dataManager.openOrders, bot.status != Models_1.BotStatus.STABLE ? bot.secound : 0);
                    t = dataManager.chart[dataManager.currentCandle];
                    if (!!t) return [3 /*break*/, 9];
                    startChunk = dataManager.chart.at(-1).time + 1000;
                    endChunk_1 = Math.min(end, startChunk + dataManager.MIN_CHART_SIZE * 1000);
                    return [4 /*yield*/, dataManager.fetchAllCharts(startChunk, endChunk_1)];
                case 8:
                    _f.sent();
                    dataManager.currentCandle = dataManager.MIN_CHART_SIZE;
                    t = dataManager.chart[dataManager.currentCandle];
                    if (!t) {
                        return [3 /*break*/, 14];
                    }
                    _f.label = 9;
                case 9:
                    if (ordersToFill.length) {
                        o = ordersToFill[0];
                        console.log("Execute " + o.side + ": " + t.high + " ~ " + t.low, new Date(parseFloat(t.time)));
                        dataManager.orderexecute(o, t);
                        ToPlace = true;
                    }
                    else if (dataManager.openOrders.length &&
                        (t.time - dataManager.openOrders[0].time) * 1000 >= bot.secound &&
                        bot.status != Models_1.BotStatus.STABLE) {
                        ToPlace = true;
                    }
                    if (!DALSimulation_1.DAL.instance.awaiter) return [3 /*break*/, 11];
                    console.log("awaiter");
                    DALSimulation_1.DAL.instance.awaiter = false;
                    return [4 /*yield*/, timeout(100)];
                case 10:
                    _f.sent();
                    _f.label = 11;
                case 11:
                    if (!dataManager.hasMoney(t) && t.close) {
                        console.log("😰Liquid at: " + t.close);
                        DALSimulation_1.DAL.instance.logStep({ "type": "😰Liquid", low: t.close, priority: 10 });
                        return [3 /*break*/, 14];
                    }
                    _e = ToPlace;
                    if (!_e) return [3 /*break*/, 13];
                    return [4 /*yield*/, place(bot)];
                case 12:
                    _e = (_f.sent());
                    _f.label = 13;
                case 13:
                    _e;
                    dataManager.currentCandle++;
                    return [3 /*break*/, 7];
                case 14:
                    dataManager.currentCandle--;
                    dataManager.closePosition(dataManager.chart[dataManager.currentCandle].low);
                    console.log("Profit: " + dataManager.profit);
                    return [4 /*yield*/, DALSimulation_1.DAL.instance.endTest()];
                case 15:
                    _f.sent();
                    (0, process_1.exit)(0);
                    return [2 /*return*/];
            }
        });
    });
}
// async function checkTrailing(bot: Bot, o: Order, t: CandleStick) {
//   if (trailing && o.type == "TRAILING_STOP_MARKET") {
//     const direction = bot.direction;
//     trailing = direction ? Math.min(t.low, trailing) : Math.max(t.high, trailing)
//     console.log(`Trailing Update: ${trailing}`)
//     if ((direction ? -1 : 1) * (trailing - t.close) / trailing > bot.callbackRate / 100) {
//       console.log(`Execute Trailing ${o.side}: ${t.high} ~ ${t.low}`)
//       o.price = t.close
//       dataManager.orderexecute(o)
//       await place(bot)
//       return true
//     }
//   }
//   return false
// }
function place(bot) {
    return __awaiter(this, void 0, void 0, function () {
        var worker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    dataManager.simulateState();
                    switch (bot.bot_type_id.toString()) {
                        case "1":
                            worker = new PlaceOrders_1.OrderPlacer(bot, dataManager.exchangeInfo);
                            break;
                        case "2":
                            worker = new WeightAvg_1.WeightAvg(bot, dataManager.exchangeInfo);
                            break;
                        case "3":
                            worker = new FuturesTrader_1.FutureTrader(bot, dataManager.exchangeInfo);
                            break;
                        case "4":
                            worker = new DualBot_1.DualBot(bot, dataManager.exchangeInfo);
                            break;
                        case "5":
                            worker = new DirectionTrader_1.DirectionTrader(bot, dataManager.exchangeInfo);
                            break;
                        case "6":
                            worker = new Periodically_1.Periodically(bot, dataManager.exchangeInfo);
                            break;
                        case "7":
                        default: {
                            worker = new OneStep_1.OneStep(bot, dataManager.exchangeInfo);
                            // (worker as OneStep).cancelOrders = async () => {dataManager.openOrders = []}
                            break;
                        }
                    }
                    worker.getAction = dataManager.openOrder;
                    return [4 /*yield*/, worker.place()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function timeout(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
run();
