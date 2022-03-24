"use strict";
exports.__esModule = true;
exports.Key = exports.Account = exports.Order = exports.Bot = void 0;
var Bot = /** @class */ (function () {
    function Bot() {
        this.bot_type_id = "1";
        this.coin1 = "";
        this.coin2 = "";
        this.stop_loose = 0;
        this.take_profit = 0;
        this.secound = 0;
        this.isFuture = false;
        this.increase_first = 1;
        this.far_speed = 1;
        this.bigPosition = 0.5;
        this.mode = false;
        this.lastStopPrice = 0;
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
