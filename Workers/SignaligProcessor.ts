import { ObjectId } from "mongodb";
import { Bot } from "../Models";
import { BasePlacer } from "./BasePlacer";
import { FutureTrader } from "./FuturesTrader";

const SIGNALING_REGEXES = [
  '⚡️⚡️ #(.*)\/(.*) ⚡️⚡️\nExchanges: Binance (.*)\nSignal Type: Regular \\((.*)\\)\nLeverage: Cross \\((.*)X\\)\n+Deposit only (.*)\%\n\nEntry Targets:\n((?:\\d\\).*\n)+)\nTake-Profit Targets:\n((?:\\d\\).*\n)+)\nStop Targets:\n((?:\\d\\).*\n)+)',
  '📦#(.*)\/(.*)-(.*)🔦(.*)IDEA(.*)🪤Maxleveragerecommended:(.*)✓ENTRY:-(.*)-(.*)💵Target1:(.*)💵Target2:(.*)💵Target3:(.*)💵Target4:(.*)💵Target5:(.*)💵Target6:(.*)🪄Stop\\|Loss:(.*)'
]

export class GroupCode {
  static EDITING_GROUP = -1001596116968
  static MIDDLEWARE_GROUP = -1001548647054
  static SPOT_GROUP = -1001799305610
}

export class SignaligProcessor {
  static instance = new SignaligProcessor()
  bots = new Array<Bot>()
  futuresExchangeInfo: any

  proccessTextSignal(message: String) {
    for (let regex of SIGNALING_REGEXES) {
      const match = message.replace(/\s/g, '').match(regex)
      if (match) {
        const s = new Signaling()
        s._id = new ObjectId();
        let lev, enter1, enter2;

        [, s.coin1, s.coin2, , s.direction, , lev, enter1, enter2] = match
        s.enter = [parseFloat(enter1), parseFloat(enter2)]
        s.takeProfits = match.slice(9, 15).map(x => parseFloat(x))
        s.stop = parseFloat(match[15])
        s.lervrage = parseInt(lev)
        s.direction = s.direction == "Bullish" ? "LONG" : "SHORT"
        console.log(s)
        this.placeOrders(s)
      }
    }
  }

  async placeOrders(signaling: Signaling) {

    for (let bot of this.bots) {
      new SignalingPlacer(bot, this.futuresExchangeInfo, signaling).place()
    }
  }

  setBots(bots: Array<Bot>) {
    this.bots = bots
  }
}

class SignalingPlacer extends FutureTrader {
  signaling: Signaling
  constructor(bot: Bot, e, signaling: Signaling) {
    bot.coin1 = signaling.coin1
    bot.coin2 = signaling.coin2
    super(bot, e)
    this.signaling = signaling
  }

  async place() {
    const price = this.roundPrice(average(this.signaling.enter))
    const qu = 10 / price

    this.place_order(
      this.PAIR,
      qu,
      price,
      this.signaling.direction == "LONG" ? true : false)


    this.place_order(
      this.PAIR,
      qu / 2,
      this.signaling.takeProfits[1],
      this.signaling.direction == "LONG" ? false : true, {
      type: "STOP",
      stopPrice: price
    })
    
    this.place_order(
      this.PAIR,
      qu / 2,
      this.signaling.takeProfits[3],
      this.signaling.direction == "LONG" ? false : true, {
      type: "STOP",
      stopPrice: price
    })

    this.place_order(
      this.PAIR,
      qu,
      this.signaling.stop,
      this.signaling.direction == "LONG" ? false : true, {
      type: "STOP",
      stopPrice: this.signaling.stop
    })
  }
}


export class Signaling {
  public _id!: ObjectId;

  public coin1!: string;

  public coin2!: string;

  public market!: string;


  public direction!: string;


  public lervrage: number = 1;


  public deposit!: string;


  public enter: Array<number> = [];


  public stop!: number;


  public takeProfits: Array<number> = [];

  get pair(): string {
    return this.coin1 + this.coin2
  }

  get eep(): number {
    return average([average(this.enter), this.enter[0]])
  }

  get stopPercent(): number {
    return Math.abs(diffInPrecents(this.eep, this.stop)) * this.lervrage
  }
  get profitercent(): number {
    return Math.abs(diffInPrecents(this.takeProfits[0], this.eep)) * this.lervrage
  }

  get lowEnter(): number {
    return this.enter.at(-1)!
  }
}
export function diffInPrecents(a: number, b: number) {
  return ((a - b) / a) * 100
}

export function average(arr: Array<number>) {
  const sum = arr.reduce((a, b) => a + b, 0);
  return (sum / arr.length) || 0;
}
