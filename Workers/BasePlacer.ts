import Binance from "node-binance-api";
import { DAL } from "../DAL.js";
import { BotLogger } from "../Logger.js";
import { Bot, BotStatus, Order } from "../Models.js";
import { Sockets } from "../Sockets/Sockets.js";

export abstract class BasePlacer {
  abstract place();

  filters: any;
  exchangeInfo: any;
  FIRST: string;
  SECOND: string;
  PAIR: string;

  binance: Binance;
  balance: Map<String, any>;
  orders: Array<Order>;

  distanceTimestamp: number = 0;

  myLastOrder: Order | undefined;
  myLastStandingBuy: Order | undefined;
  myLastBuyAvg;
  standingBuy: Order | undefined;
  oldestStandingBuy: Order | undefined;

  lastBuy: Order | undefined;
  lastSell: Order | undefined;

  sockets = Sockets.getInstance();

  bot: Bot;

  error = false;

  constructor(_bot: Bot, _exchangeInfo) {
    this.FIRST = _bot.coin1;
    this.SECOND = _bot.coin2;
    this.PAIR = _bot.coin1 + _bot.coin2;

    this.binance = _bot.binance!.binance;
    this.balance = _bot.binance?.balance;
    this.orders = _bot.binance?.orders[this.PAIR];

    this.exchangeInfo = _exchangeInfo.symbols.find(
      (s) => s.symbol == this.PAIR
    );
    this.filters = this.exchangeInfo.filters.reduce((a, b) => {
      a[b.filterType] = b;
      return a;
    }, {});

    this.bot = _bot;
    this.bot.botStatus = BotStatus.WORK;
  }

  async buyBNB() {
    if (
      this.bot.minbnb &&
      this.balance.get("BNB").available < this.bot.minbnb &&
      !this.PAIR.includes("BNB")
    ) {
      try {
        const bnbPair = this.exchangeInfo.symbols.find(
          (s) => s.symbol == "BNB" + this.SECOND
        )
          ? "BNB" + this.SECOND
          : this.FIRST + "BNB";

        await this.binance!.marketBuy(bnbPair, this.bot.bnbamount);
      } catch (e) {
        // console.log(e)
      }
    }
  }

  align(price, direction, qu) {
    let tick =
      parseFloat(this.filters.PRICE_FILTER.tickSize) || this.bot.tickSize;

    const book =
      this.sockets.orderBooks[this.PAIR][direction ? "bids" : "asks"];
    for (let orderPrice in book) {
      if (direction && price > orderPrice && qu < book[orderPrice] * 2) {
        return parseFloat(orderPrice) + tick;
      }

      if (!direction && price < orderPrice && qu < book[orderPrice] * 2) {
        return parseFloat(orderPrice) - tick;
      }
    }

    return price;
  }

  buySide = () => (this.bot.direction ? "SELL" : "BUY");

  sellSide = () => (this.bot.direction ? "BUY" : "SELL");

  buildHistory() {
    // const buys = Array<Order>();
    const sellOrders: Array<string> = [];
    this.myLastOrder = undefined;
    this.myLastStandingBuy = undefined;
    this.lastBuy = undefined;
    this.lastSell = undefined;
    // this.currentPnl = 0;
    this.standingBuy = undefined;

    // for (let order of this.orders
    //   .filter((x) => x.status.includes("FILLED"))
    //   .filter((x) => x.positionSide == this.bot.positionSide())
    //   .reverse()) {
    for (let i = this.orders.length - 1; i > 0; i--) {
      if (this.standingBuy && this.lastSell) {
        break;
      }

      const order = this.orders[i];
      if (
        !order.status.includes("FILLED") ||
        order.positionSide != this.bot.positionSide()
      ) {
        continue;
      }
      this.myLastOrder ||= order;
      if (order.side == this.buySide()) {
        this.lastBuy ||= order;

        if (!sellOrders.join("").includes(order.orderId)) {
          this.standingBuy ||= order;
          // Spot only
          // this.oldestStandingBuy = order;
          // buys.push(order);
        }
      } else {
        this.lastSell ||= order;
        // Spot only
        // if (
        //   order.clientOrderId.includes("SELLbig") &&
        //   !this.myLastStandingBuy
        // ) {
        //   this.myLastStandingBuy = this.orders.find(
        //     (x) => x.orderId == order.clientOrderId.split("SELLbig")[1]
        //   );
        // }
        sellOrders.push(order.clientOrderId);
      }

      if (order.isFirst()) {
        break;
      }
    }
  }
  calculatePNL(): number {
    let currentPnl = 0
    for  (let i = 1; i < this.orders.length; i++) {
      const order = this.orders[i];
      if (
        order.positionSide == this.bot.positionSide() &&
        order.status.includes("FILLED")
      ) {
        currentPnl += order.pnl - order.avgPrice * order.executedQty * 0.0002;
      }
    }
   

    const afterTransfer =
      (args1) =>
      (...args) =>
        BotLogger.instance.log({
          type: "afterTransfer",
          args: args,
          bot_id: this.bot.id(),
          ...args1,
        });

    if (this.bot.binance!.needTransfer.includes(this.PAIR)) {
      this.bot.binance!.needTransfer = this.bot.binance!.needTransfer.filter(
        (x) => x != this.PAIR
      );
      const amount = Math.abs(currentPnl * this.bot.backupPrecent);
      const args = {
        amount,
        currentPnl: currentPnl,
        backupPrecent: this.bot.backupPrecent,
        direction: currentPnl > 0 ? "FuturesToMain" : "MainToFutures",
      };

      if (currentPnl > 0) {
        this.binance.transferFuturesToMain(
          this.SECOND,
          amount,
          afterTransfer(args)
        );
      } else {
        this.binance.transferMainToFutures(
          this.SECOND,
          amount,
          afterTransfer(args)
        );
      }
    }
    return currentPnl;
    // this.myLastBuyAvg = this.weightAverage(buys);
  }

  weightAverage(arr) {
    const overallQu = arr.reduce((a, b) => a + parseFloat(b.executedQty), 0.0);
    return arr.reduce(
      (a, b) => a + parseFloat(b.price) * (b.executedQty / overallQu),
      0.0
    );
  }

  roundQu = (qu) =>
    this.truncDigits(
      qu,
      this.countDecimals(parseFloat(this.filters.LOT_SIZE.stepSize))
    );
  roundPrice = (price) =>
    this.truncDigits(
      price,
      this.countDecimals(parseFloat(this.filters.PRICE_FILTER.tickSize))
    );

  abstract getAction(type: boolean): Function;

  async place_order(
    coin,
    qu,
    price,
    type: boolean,
    params?,
    increaseToMinimum = false
  ) {
    let minNotional =
      this.filters.MIN_NOTIONAL.minNotional ||
      this.filters.MIN_NOTIONAL.notional ||
      this.bot.minNotional;

    if (coin == "BNB") {
      qu -= this.bot.minbnb;
    }

    const action: Function = this.getAction(type);

    if (this.bot.align) {
      price = this.align(price, type, qu);
    }

    qu = this.roundQu(qu);

    this.bot.lastOrder = new Date().getTime();

    if (price) {
      price = this.roundPrice(price);
      if (
        qu * price < minNotional &&
        !params?.closePosition &&
        !params?.reduceOnly
      ) {
        if (increaseToMinimum) {
          qu = this.roundQu((parseFloat(minNotional) + 1) / price);
        } else {
          BotLogger.instance.log({
            type: "QuantitiyTooLow",
            bot_id: this.bot._id,
            qu,
            price,
            params,
            minNotional,
          });
          console.log("quantity is to small", qu, price, this.bot.id());
          return;
        }
      }
    }

    params ||= {};
    params.timeInForce = "GTC";
    params.positionSide = this.bot.positionSide();
    params.timeInForce = "GTC";

    try {
      let res = await action(this.PAIR, qu, price, params);
      if (res.msg) {
        console.log(
          res.msg,
          this.PAIR,
          price || params.stopPrice || params.activationPrice,
          qu,
          this.bot.id()
        );
        const error = {
          type: "PlaceOrderError",
          bot_id: this.bot._id,
          user_id: this.bot.user_id,
          side: type,
          coin: this.PAIR,
          amount: qu,
          price: price || params.stopPrice || params.activationPrice,
          message: res.msg,
          created_at: new Date(),
        };
        !this.isSemulation && DAL.instance.logError(error);
        BotLogger.instance.error(error);

        this.error = true;
        return res;
      } else {
        console.log(
          this.PAIR,
          res.side,
          res.price || params.stopPrice || params.activationPrice,
          res.origQty,
          res.status
        );
        BotLogger.instance.log({
          type: "PlaceOrder",
          bot_id: this.bot._id,
          res,
        });
        if (res.status == "EXPIRED") {
          return res.status;
        }
      }
    } catch (e: any) {
      this.error = true;
      console.error(e.body || e);
      const error = {
        type: "PlaceOrderError",
        bot_id: this.bot._id,
        user_id: this.bot.user_id,
        side: type,
        coin: this.PAIR,
        amount: qu,
        price: price,
        message: e.body || e,
        created_at: new Date(),
      };
      !this.isSemulation && DAL.instance.logError(error);
      BotLogger.instance.error(error);

      return e;
    } finally {
    }
  }

  parseAllValues() {
    for (let k in this.bot) {
      if (parseFloat(this.bot[k]) == this.bot[k]) {
        this.bot[k] = parseFloat(this.bot[k]);
      }
    }
  }

  truncDigits = function (
    number: number,
    digits: number,
    roundFunc: Function = Math.floor
  ) {
    const fact = 10 ** digits;
    return roundFunc(number * fact) / fact;
  };

  countDecimals = function (number: number): number {
    if (Math.floor(number) === number) {
      return 0;
    }
    if (number.toString().includes("-")) {
      return parseInt(number.toString().split("-")[1]);
    }
    if (!number.toString().includes(".")) return 0;
    return number.toString().split(".")[1].length || 0;
  };

  get isSemulation() {
    return process.argv.join("").includes("Simulator");
  }

  getCurrentTime() {
    return new Date().getTime();
  }
}
