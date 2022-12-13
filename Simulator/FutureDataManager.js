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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FutureDataManager = void 0;
var Models_1 = require("../Models");
var SocketsFuture_1 = require("../Sockets/SocketsFuture");
var DataManager_1 = require("./DataManager");
var FutureDataManager = /** @class */ (function (_super) {
    __extends(FutureDataManager, _super);
    function FutureDataManager(bot) {
        var _this = _super.call(this, bot) || this;
        _this.sockets = SocketsFuture_1.SocketsFutures.getFInstance();
        _this.sockets.averagePrice = _this.averagePrice.bind(_this);
        _this.sockets.averagePriceQuarter = _this.averagePriceQuarter.bind(_this);
        if (_this.sockets instanceof SocketsFuture_1.SocketsFutures) {
            _this.sockets.ticker = _this.ticker.bind(_this);
        }
        return _this;
    }
    FutureDataManager.prototype.orderexecute = function (order, t) {
        var qu = (order.side == "BUY" ? 1 : -1) * order.executedQty;
        var gain = 0;
        var pos = this.bot.binance.positions[this.PAIR + this.bot.positionSide()];
        if (order.closePosition) {
            console.log("SLprice1: ", ((pos.positionEntry - order.price) / pos.positionEntry) * pos.positionAmount);
            order.executedQty = Math.abs(pos.positionAmount);
            gain = (order.price - pos.positionEntry) * pos.positionAmount;
            pos.positionAmount = 0;
            pos.positionEntry = 0;
            console.log("Closing position with profit of: " + (gain / this.bot.binance.balance[this.bot.coin2] * 100).toFixed() + "%");
            this.dal.logStep({ type: 'Close Position', priority: 5 });
            this.bot.binance.orders[this.PAIR] = [];
        }
        else if (qu * pos.positionAmount < 0) {
            gain = (pos.positionEntry - order.price) * order.executedQty * (order.side == "BUY" ? 1 : -1);
            pos.positionAmount += qu;
        }
        else {
            pos.positionEntry = ((pos.positionEntry * Math.abs(pos.positionAmount)) + (order.executedQty * order.price)) / (Math.abs(pos.positionAmount) + order.executedQty);
            pos.positionAmount += qu;
        }
        order.pnl = gain;
        gain -= (order.avgPrice * order.executedQty * 0.0002);
        this.bot.binance.balance[this.bot.coin2] += gain;
        this.profit += gain;
        console.log("Psition size: " + pos.positionAmount);
        console.log("Variation: " + this.dal.variation + "Profit: " + (this.profit / 100).toFixed(2) + "% Date: " + new Date(parseInt(this.chart[this.currentCandle].time)));
        this.dal.logStep({
            type: order.type == "STOP_MARKET" ? "StopLoose" : 'Execute',
            side: order.side,
            price: order.price,
            quantity: order.executedQty,
            high: t.high,
            low: t.low,
            positionSize: pos.positionAmount,
            positionPnl: (order.price - pos.positionEntry) * pos.positionAmount,
            profit: (this.profit / 100).toFixed(0) + "%",
            balanceSecond: (this.bot.binance.balance[this.bot.coin2]).toFixed(2),
            balanceFirst: (this.bot.binance.balance[this.bot.coin1]).toFixed(2),
            priority: 1
        });
        order.status = 'FILLED';
        this.bot.binance.orders[this.PAIR].push(order);
        this.openOrders = this.openOrders.filter(function (o) { return o.orderId != order.orderId; });
    };
    FutureDataManager.prototype.closePosition = function (price) {
        this.orderexecute(Object.assign(new Models_1.Order(), {
            closePosition: true,
            price: price,
            type: "STOP_MARKET",
        }), this.chart[this.currentCandle]);
    };
    FutureDataManager.prototype.hasMoney = function (t) {
        var pos = this.bot.binance.positions[this.PAIR + this.bot.positionSide()];
        var profit = (t.close - pos.positionEntry) * pos.positionAmount;
        return -profit < this.bot.binance.balance[this.bot.coin2];
    };
    return FutureDataManager;
}(DataManager_1.DataManager));
exports.FutureDataManager = FutureDataManager;
