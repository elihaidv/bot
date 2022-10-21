"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.average = exports.diffInPrecents = exports.Signaling = exports.SignalingType = exports.Key = exports.Account = exports.Order = exports.Bot = void 0;
var Bot = /** @class */ (function () {
    function Bot() {
        this.bot_type_id = "1";
        this.coin1 = "";
        this.coin2 = "";
        this.stop_loose = 0;
        this.SMA = 0;
        this.take_profit = 0;
        this.secound = 0;
        this.isFuture = false;
        this.increase_first = 1;
        this.far_speed = 1;
        this.bigPosition = 0.5;
        this.mode = false;
        this.lastStopPrice = 0;
        this.dynamicDirection = false;
        this.signalings = [];
        this.avoidCancel = false;
    }
    Bot.prototype.id = function () { return this._id.toString(); };
    Bot.prototype.positionSide = function () {
        return this.isFuture ? (this.mode ? (this.direction ? 'SHORT' : 'LONG') : 'BOTH') : '';
    };
    Bot.STABLE = -1;
    return Bot;
}());
exports.Bot = Bot;
var Order = /** @class */ (function () {
    function Order(side, status, price, orderId, origQty, executedQty, time, type, clientOrderId, positionSide, avgPrice) {
        var _this = this;
        if (side === void 0) { side = ""; }
        if (status === void 0) { status = ""; }
        if (price === void 0) { price = 0; }
        if (orderId === void 0) { orderId = ""; }
        if (origQty === void 0) { origQty = 0; }
        if (executedQty === void 0) { executedQty = 0; }
        if (time === void 0) { time = 0; }
        if (type === void 0) { type = ""; }
        if (clientOrderId === void 0) { clientOrderId = ""; }
        if (positionSide === void 0) { positionSide = ""; }
        if (avgPrice === void 0) { avgPrice = ""; }
        this.pnl = 0;
        this.isFirst = function () { return _this.clientOrderId.includes("FIRST"); };
        this.isBigPosition = function () { return _this.clientOrderId.includes("BigPosition"); };
        this.orderPrice = function () { return parseFloat(_this.price) || _this.avgPrice; };
        this.side = side;
        this.status = status;
        this.price = price;
        this.orderId = orderId;
        this.origQty = origQty;
        this.executedQty = executedQty;
        this.time = time;
        this.type = type;
        this.clientOrderId = clientOrderId,
            this.positionSide = positionSide;
        this.avgPrice = avgPrice;
    }
    return Order;
}());
exports.Order = Order;
var Account = /** @class */ (function () {
    function Account(binance) {
        this.balance = {};
        this.positions = {};
        this.binance = binance;
        this.orders = {
            changed: [],
            orderFilled: {}
        };
    }
    return Account;
}());
exports.Account = Account;
var Key = /** @class */ (function () {
    function Key() {
    }
    return Key;
}());
exports.Key = Key;
var SignalingType = /** @class */ (function () {
    function SignalingType(regex, coin1, coin2, direction, leverage, enterPriceStart, enterPriceEnd, takeProfitStart, takeProfitEnd, stop, longTerm) {
        this.regex = regex;
        this.coin1 = coin1;
        this.coin2 = coin2;
        this.direction = direction;
        this.leverage = leverage;
        this.enterPriceStart = enterPriceStart;
        this.enterPriceEnd = enterPriceEnd;
        this.takeProfitStart = takeProfitStart;
        this.takeProfitEnd = takeProfitEnd;
        this.stopPrice = stop;
        this.longTerm = longTerm;
    }
    return SignalingType;
}());
exports.SignalingType = SignalingType;
var Signaling = /** @class */ (function () {
    function Signaling() {
        this.lervrage = "1";
        this.enter = [];
        this.takeProfits = [];
        this.date = new Date();
    }
    Object.defineProperty(Signaling.prototype, "pair", {
        get: function () {
            return this.coin1 + this.coin2;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Signaling.prototype, "eep", {
        get: function () {
            return average([average(this.enter), this.enter[0]]);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Signaling.prototype, "stopPercent", {
        get: function () {
            return Math.abs(diffInPrecents(this.eep, this.stop));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Signaling.prototype, "profitercent", {
        get: function () {
            return Math.abs(diffInPrecents(this.takeProfits[0], this.eep));
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Signaling.prototype, "lowEnter", {
        get: function () {
            return this.enter.at(-1);
        },
        enumerable: false,
        configurable: true
    });
    return Signaling;
}());
exports.Signaling = Signaling;
function diffInPrecents(a, b) {
    return ((a - b) / a) * 100;
}
exports.diffInPrecents = diffInPrecents;
function average(arr) {
    var sum = arr.reduce(function (a, b) { return a + b; }, 0);
    return (sum / arr.length) || 0;
}
exports.average = average;
