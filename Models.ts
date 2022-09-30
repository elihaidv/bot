
import { ObjectId } from "mongodb";

export class Bot {
    static STABLE = -1;

    _id;
    bot_type_id = "1";
    coin1 = "";
    coin2 = "";
    binance: Account | undefined
    buy_side;
    buy_percent;
    sell_side;
    sell_percent;
    last_distance_minutes;
    last_buy_dist;
    stop_loose: number = 0;
    last_distance;
    SMA = 0;
    amount_percent;
    amount_percent_sell;
    minbnb;
    bnbamount;
    tickSize;
    minNotional;
    align;
    lastOrder;
    divide_buy;
    divide_sell;
    diffrent_buy;
    diffrent_sell;
    increase_factor;
    take_profit: number = 0;
    key_id;
    secound: number = 0;
    leverage: any;
    isFuture: boolean = false;
    closer: any;
    direction: any;
    increase_first: number = 1;
    far_speed: number = 1;
    callbackRate: any;
    sellAdded: any;
    take_profit_position: any;
    multiassets: any;
    bigPosition: number = 0.5;
    mode: boolean = false;
    lastStopPrice = 0;
    classname: any;
    dynamicDirection: boolean = false;
    user_id: any;
    signalings: Array<Signaling> = [];

    id(): String { return this._id.toString() }

    positionSide(): String {
        return this.isFuture ? (this.mode ? (this.direction ? 'SHORT' : 'LONG') : 'BOTH') : ''
    }
}



export class Order {
    side: string
    status: string;
    price: any;
    orderId: string
    origQty: number
    executedQty: number
    time: number
    type: string
    pnl = 0
    clientOrderId: string
    positionSide: any;
    avgPrice: any;
    closePosition:any;


    constructor(
        side: string = "",
        status: string = "",
        price: number = 0,
        orderId: string = "",
        origQty: number = 0,
        executedQty: number = 0,
        time: number = 0,
        type: string = "",
        clientOrderId: string = "",
        positionSide: any = "",
        avgPrice: any = ""
    ) {
        this.side = side
        this.status = status
        this.price = price
        this.orderId = orderId
        this.origQty = origQty
        this.executedQty = executedQty
        this.time = time
        this.type = type
        this.clientOrderId = clientOrderId,
        this.positionSide = positionSide
        this.avgPrice = avgPrice
    }



    isFirst = (): boolean => this.clientOrderId.includes("FIRST")

    isBigPosition = (): boolean => this.clientOrderId.includes("BigPosition")

    orderPrice = ():number => parseFloat(this.price) || this.avgPrice

}

export class Account {

    orders: any
    balance: any = {}
    binance: any
    socket: any
    positions: any = {};

    constructor(binance) {
        this.binance = binance
        this.orders = {
            changed: [],
            orderFilled: {}
        }
    }

}

export class Key {
    _id;
    public
    secret
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

    public date : Date = new Date();
  
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
  