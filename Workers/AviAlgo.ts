
import { Bot, BotStatus, LONG, LevelRaise, SHORT } from "../Models.js";
import { FutureTrader } from "./FuturesTrader.js";



export class AviAlgo extends FutureTrader {

    lastLevel: LevelRaise | undefined
    levels: Array<LevelRaise> = []

    constructor(bot: Bot, futuresExchangeInfo: any) {
        super(bot, futuresExchangeInfo)
        this.parseLevels()
        this.futureSockets.addRealtimePrices(this.PAIR)
    }

    placeFirstOrder() {
        const secondsSum = this.levels.reduce((sum, level) => sum + level.seconds, 0)
        let secondsCount = 0
        let pump = true, dump = true
        const prices = this.futureSockets.getRealtimePrices(this.PAIR)

        if (!prices || prices.length < secondsSum + this.lastLevel!.seconds ||
             this.bot.botStatus == BotStatus.STABLE) return

        for (let level of this.levels) {
            const startCandle:any = prices[secondsSum - secondsCount]
            const endCandle:any = prices[secondsSum - secondsCount - level.seconds]
            const change = (endCandle - startCandle) / startCandle
            secondsCount += level.seconds
            if (change < level.raise) {
                pump = false
            }

            if (change > -level.raise) {
                dump = false
            }
        }

        this.bot.direction = pump ? LONG : dump ? SHORT : -1

        if (this.bot.direction == -1) {
            this.bot.secound = 0
            this.bot.lastOrder = 0
            return false
        }

        const qu = this.balance[this.SECOND] * this.bot.leverage * this.bot.amount_percent
        const price = prices[0] * this.add(1, this.lastLevel!.raise)
        
        this.place_order(this.PAIR, qu / price, 0, !this.bot.direction,{
            stopPrice: price,
            type: 'STOP_MARKET'
        })
        
        this.bot.secound = this.lastLevel!.seconds
    }

    parseLevels() {
        const levelsRaise = this.bot.levelsRaise.split(',')
        const levelsSeconds = this.bot.levelsSeconds.split(',')
       
        for (let i = 0; i < levelsRaise.length - 1; i++) {
            this.levels.push(new LevelRaise(
                parseInt(levelsSeconds[i]),
                parseFloat(levelsRaise[i])
            ))
        }
        this.lastLevel = new LevelRaise(
            parseInt(levelsSeconds[levelsSeconds.length - 1]),
            parseFloat(levelsRaise[levelsRaise.length - 1])
        )
        
    }

    async place() {


        this.calculatePrice()
        this.buildHistory()
        
        if (this.positionAmount == 0) {
            this.placeFirstOrder()
            return
        }

        const markPrice = this.futureSockets.markPrices[this.PAIR]


        this.bot.botStatus = BotStatus.STABLE
        await this.place_order(this.PAIR, this.positionAmount, 0, this.bot.direction, {
            type: "TRAILING_STOP_MARKET",
            activationPrice: this.roundPrice(markPrice),
            callbackRate: this.bot.callbackRate,
            newClientOrderId: "LAST-SL-" + this.PAIR,
        })


    }
}