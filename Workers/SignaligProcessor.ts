import { ObjectId } from "mongodb";
import { Bot } from "../Models";

const SIGNALING_REGEXES = [
    '⚡️⚡️ #(.*)\/(.*) ⚡️⚡️\nExchanges: Binance (.*)\nSignal Type: Regular \\((.*)\\)\nLeverage: Cross \\((.*)X\\)\n+Deposit only (.*)\%\n\nEntry Targets:\n((?:\\d\\).*\n)+)\nTake-Profit Targets:\n((?:\\d\\).*\n)+)\nStop Targets:\n((?:\\d\\).*\n)+)',
    '📦#(.*)\/(.*)-(.*)🔦(.*)IDEA(.*)🪤Maxleveragerecommended:(.*)✓ENTRY:-(.*)-(.*)💵Target1:(.*)💵Target2:(.*)💵Target3:(.*)💵Target4:(.*)💵Target5:(.*)💵Target6:(.*)🪄Stop\|Loss:(.*)'
]

export class GroupCode {
    static EDITING_GROUP = -1001596116968
    static MIDDLEWARE_GROUP = -1001548647054
    static SPOT_GROUP = -1001799305610
}

export class SignaligProcessor {
    static instance = new SignaligProcessor()
    bots = new Array<Bot>()
    proccessTextSignal(message: String) {
        for (let regex of SIGNALING_REGEXES) {
            const match = message.replace(/\s/g, '').match(regex)
            if (match) {
                const s = new Signaling()
                s._id = new ObjectId();
                let lev, enter1, enter2;

                [,s.coin1, s.coin2, , s.direction,, lev, enter1,enter2 ] = match
                s.enter = [parseFloat(enter1), parseFloat(enter2)]
                s.takeProfits = match.slice(8, 13).map(x => parseFloat(x))
                s.stop = parseFloat(match[13])
                s.lervrage = parseInt(lev)
                s.direction = s.direction == "Bullish" ? "LONG" : "SHORT"
                console.log(s)
                this.placeOrders(s)
            }
        }
    }

    async placeOrders(signaling: Signaling) {
        for(let bot of this.bots) {
            bot.binance?.binance.futuresBuy(
                signaling.coin1 + signaling.coin2,
                signaling.enter[0],
                10 * signaling.enter[0],
            );


        }
    }

    setBots(bots: Array<Bot>) {
        this.bots = bots
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

export function average(arr:Array<number>){
    const sum = arr.reduce((a, b) => a + b, 0);
    return (sum / arr.length) || 0;
}
