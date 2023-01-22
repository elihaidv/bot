import { CandleStick, DataManager } from "./Simulator/DataManager";
import fetch from 'node-fetch';
import { Storage } from "@google-cloud/storage";
import { env, exit } from "process";
import { ExecOptions } from "child_process";
import { promises } from "fs" 
import { Bot } from "./Models";

var ip = require('ip');


const PAGE_SIZE = 2000
export class DAL {
    started
    dataManager
    variations:{[n:number]:DALVariation} = {}
    simulationId
    awaiter = false
    start
    end

    async init(dataManager: DataManager | null, simulationId, start, end) {
        this.dataManager = dataManager
        this.simulationId = simulationId
        this.start = start
        this.end = end

        // setTimeout(() => this.updateProgress("timeout"), 3400000)
    }

    async logStep(step, bot:Bot) {
        if (this.isQuiet) return

        if (!this.variations[bot.variation]) {
            this.variations[bot.variation] = new DALVariation()
        }
        const dalVariation = this.variations[bot.variation]

        step.time = this.dataManager.chart[this.dataManager.currentCandle].time
        const stepArr = [step.time,
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
            step.sma && step.sma,
            step.longSMA && step.longSMA,
        ]

        dalVariation.steps.push(stepArr)
        dalVariation.stepsCounts++


        if (dalVariation.stepsCounts % (PAGE_SIZE / 10) == 0) {
            this.awaiter = true
        }

        if (Math.floor(dalVariation.stepsCounts / PAGE_SIZE) > dalVariation.page) {
            dalVariation.page++
            this.saveInBucket(bot.variation)
            await this.updateProgress("running", null, bot)

        }

    }

    updateProgress(status, t:CandleStick|null = null,  bot:Bot) {

        const start = new Date(this.start).getTime()
        const end = new Date(this.end).getTime()
        const time = t?.time ?? this.dataManager.chart[this.dataManager.currentCandle].time
        const progress = Math.round((time - start) / (end - start) * 100)
        const dalVariation = this.variations[bot.variation]

        const data = JSON.stringify({
            profit: (bot.profitNum / 100).toPrecision(2) + "%",
            maxPage: dalVariation.page - 1,
            progress: status == "finished" ? 100 : progress,
            status: status,
            variation: bot.variation,
            ip: ip.address()
        })
        console.log(data)

        return fetch("https://itamars.live/api/simulations/" + this.simulationId, {
            method: 'PUT',
            body: data,
            headers: {
                "API-KEY": "WkqrHeuts2mIOJHMcxoK",
                "Accept": "application/json",
                'Content-Type': 'application/json',
            }

        }).then(r => r.text())
            .then(console.log)
            .catch(console.error)
    }

    get isQuiet() {
        return process.argv.join("").includes('quiet')
    }

    async endTest(bot:Bot) {

        if (this.isQuiet) return


        const dalVariation = this.variations[bot.variation]
        dalVariation.page++
        await this.updateProgress("finished", null, bot)

        await this.saveInBucket(bot.variation)

    }

    saveInBucket = async (variation) => {
        try {
            const dalVariation = this.variations[variation]
            const cloneSteps = dalVariation.steps.slice().sort((a, b) => a[0] - b[0] || a[12] - b[12])
            dalVariation.steps = []
            await new Storage()
                .bucket('simulations-tradingbot')
                .file(`simulation${this.simulationId}-${variation}/${dalVariation.page}.csv`)
                .save(cloneSteps
                    .map(s => s.join(','))
                    .join('\n'), { resumable: false });
        } catch (e) {
            console.error(e)
        }
    }

    saveHistoryInBucket = async (history, pair, unit, date) => {
        try {

            const historyArray = history.split("\n")
                .filter(r => r)
                .map(x => x.split(",")
                    .map(y => parseFloat(y)))
                .map(([time, open, high, low, close]) => [time, high, low, close])
                .filter(([time, high, low, close]) => time && high && low && close)

            await promises.mkdir(`spot/${pair}/${unit}`, { recursive: true })
            await promises.writeFile(`spot/${pair}/${unit}/${date}.csv`, historyArray.map(e => e.join(',')).join('\n'), { })
            // await new Storage()
            //     .bucket('crypto-history')
            //     .file(`spot/${pair}/${unit}/${date}.csv`)
            //     .save(, { resumable: false })
            //     .then(console.log)
            //     .catch(console.log);

            console.log(historyArray.length)
            return historyArray
        } catch (e) {
            console.error(e)
        }
    }

    getHistoryFromBucket = async (pair, unit, date) => {
        try {
            const file = await promises.readFile(`spot/${pair}/${unit}/${date}.csv`)
            // const file = await new Storage()
            //     .bucket('crypto-history')
            //     .file(`spot/${pair}/${unit}/${date}.csv`)
            //     .download()

            const res =  file.toString().split("\n")
                .map(x => x.split(",")
                    .map(y => parseFloat(y)))

            if (res.length < 86000) {
                console.error("history too short", res.length, pair, unit, date)
            }
            return res
        } catch (e: any) {
            if (!e.message.includes("no such file")) {
                console.error(e.message)
            }
            return null

        }
    }

}

class DALVariation {

    steps = Array<Array<any>>()
    stepsCounts = 0
    page = 0
}