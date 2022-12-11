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
exports.DAL = void 0;
var node_fetch_1 = __importDefault(require("node-fetch"));
var storage_1 = require("@google-cloud/storage");
var process_1 = require("process");
var PAGE_SIZE = 2000;
var DAL = /** @class */ (function () {
    function DAL() {
        var _this = this;
        this.steps = Array();
        this.stepsCounts = 0;
        this.page = 0;
        this.awaiter = false;
        this.saveInBucket = function () { return __awaiter(_this, void 0, void 0, function () {
            var cloneSteps, e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        cloneSteps = this.steps.slice().sort(function (a, b) { return a[0] - b[0] || a[12] - b[12]; });
                        this.steps = [];
                        return [4 /*yield*/, new storage_1.Storage()
                                .bucket('simulations-tradingbot')
                                .file("simulation" + process.argv[3] + "-" + process_1.env.JOB_COMPLETION_INDEX + "/" + this.page + ".csv")
                                .save(cloneSteps
                                .map(function (s) { return s.join(','); })
                                .join('\n'), { resumable: false })
                                .then(console.log)
                                .catch(console.log)];
                    case 1:
                        _a.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        e_1 = _a.sent();
                        console.log(e_1);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        this.saveHistoryInBucket = function (history, pair, unit, date) { return __awaiter(_this, void 0, void 0, function () {
            var historyArray, e_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        historyArray = history.split("\n")
                            .filter(function (r) { return r; })
                            .map(function (x) { return x.split(",")
                            .map(function (y) { return parseFloat(y); }); })
                            .map(function (_a) {
                            var time = _a[0], open = _a[1], high = _a[2], low = _a[3], close = _a[4];
                            return [time, high, low, close];
                        });
                        if (this.isQuiet)
                            return [2 /*return*/, historyArray];
                        return [4 /*yield*/, new storage_1.Storage()
                                .bucket('crypto-history')
                                .file("spot/" + pair + "/" + unit + "/" + date + ".csv")
                                .save(historyArray.map(function (e) { return e.join(','); }).join('\n'), { resumable: false })
                                .then(console.log)
                                .catch(console.log)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, historyArray];
                    case 2:
                        e_2 = _a.sent();
                        console.log(e_2);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
        this.getHistoryFromBucket = function (pair, unit, date) { return __awaiter(_this, void 0, void 0, function () {
            var file, e_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        if (this.isQuiet)
                            return [2 /*return*/];
                        return [4 /*yield*/, new storage_1.Storage()
                                .bucket('crypto-history')
                                .file("spot/" + pair + "/" + unit + "/" + date + ".csv")
                                .download()];
                    case 1:
                        file = _a.sent();
                        return [2 /*return*/, file[0].toString().split("\n")
                                .map(function (x) { return x.split(",")
                                .map(function (y) { return parseFloat(y); }); })];
                    case 2:
                        e_3 = _a.sent();
                        if (!e_3.message.includes("No such object")) {
                            console.log(e_3.message);
                        }
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        }); };
    }
    DAL.prototype.init = function (dataManager, simulationId) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                this.dataManager = dataManager;
                this.simulationId = simulationId;
                setTimeout(function () { return _this.updateProgress("timeout"); }, 3400000);
                return [2 /*return*/];
            });
        });
    };
    DAL.prototype.logStep = function (step) {
        return __awaiter(this, void 0, void 0, function () {
            var stepArr;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isQuiet)
                            return [2 /*return*/];
                        step.time = this.dataManager.chart[this.dataManager.currentCandle].time;
                        stepArr = [step.time,
                            step.type,
                            step.side, step.price,
                            step.quantity,
                            step.low,
                            step.high,
                            step.balanceSecond,
                            step.positionSize,
                            step.positionPnl,
                            step.profit,
                            step.balanceFirst,
                            step.priority,
                            step.sma,
                            step.longSMA,
                        ];
                        this.steps.push(stepArr);
                        this.stepsCounts++;
                        if (this.stepsCounts % (PAGE_SIZE / 10) == 0) {
                            this.awaiter = true;
                        }
                        if (!(Math.floor(this.stepsCounts / PAGE_SIZE) > this.page)) return [3 /*break*/, 2];
                        this.page++;
                        this.saveInBucket();
                        return [4 /*yield*/, this.updateProgress("running")];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    DAL.prototype.updateProgress = function (status) {
        var start = new Date(process.argv[4]).getTime();
        var end = new Date(process.argv[5]).getTime();
        var time = this.dataManager.chart[this.dataManager.currentCandle].time;
        var progress = Math.round((time - start) / (end - start) * 100);
        var data = JSON.stringify({
            profit: Number((this.dataManager.profit / 100).toPrecision(2)) + "%",
            maxPage: this.page - 1,
            progress: status == "finished" ? 100 : progress,
            status: status,
            variation: process_1.env.JOB_COMPLETION_INDEX
        });
        console.log(data);
        return (0, node_fetch_1.default)("https://itamars.live/api/simulations/" + this.simulationId, {
            method: 'PUT',
            body: data,
            headers: {
                "API-KEY": "WkqrHeuts2mIOJHMcxoK",
                "Accept": "application/json",
                'Content-Type': 'application/json',
            }
        }).then(function (r) { return r.text(); })
            .then(console.log)
            .catch(console.log);
    };
    Object.defineProperty(DAL.prototype, "isQuiet", {
        get: function () {
            return process.argv[6] == 'quiet';
        },
        enumerable: false,
        configurable: true
    });
    DAL.prototype.endTest = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.isQuiet)
                            return [2 /*return*/];
                        this.page++;
                        return [4 /*yield*/, this.updateProgress("finished")];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, this.saveInBucket()];
                    case 2:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    DAL.instance = new DAL();
    return DAL;
}());
exports.DAL = DAL;
