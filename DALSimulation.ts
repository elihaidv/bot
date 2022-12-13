import { DataManager } from "./Simulator/DataManager";
import fetch from 'node-fetch';
import { Storage } from "@google-cloud/storage";
import { env, exit } from "process";
import { ExecOptions } from "child_process";
import { promises } from "fs" 


const PAGE_SIZE = 2000
export class DAL {
    started
    dataManager
    steps = Array<Array<any>>()
    stepsCounts = 0
    page = 0
    simulationId
    awaiter = false
    variation = 0
    start
    end

    async init(dataManager: DataManager | null, simulationId, variation, start, end) {
        this.dataManager = dataManager
        this.simulationId = simulationId
        this.variation = variation
        this.start = start
        this.end = end

        // setTimeout(() => this.updateProgress("timeout"), 3400000)
    }

    async logStep(step) {
        if (this.isQuiet) return

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
        step.sma,
        step.longSMA,
        ]

        this.steps.push(stepArr)
        this.stepsCounts++


        if (this.stepsCounts % (PAGE_SIZE / 10) == 0) {
            this.awaiter = true
        }

        if (Math.floor(this.stepsCounts / PAGE_SIZE) > this.page) {
            this.page++
            this.saveInBucket()
            await this.updateProgress("running")

        }

    }

    updateProgress(status) {

        const start = new Date(this.start).getTime()
        const end = new Date(this.end).getTime()
        const time = this.dataManager.chart[this.dataManager.currentCandle].time
        const progress = Math.round((time - start) / (end - start) * 100)

        const data = JSON.stringify({
            profit: Number((this.dataManager.profit / 100).toPrecision(2)) + "%",
            maxPage: this.page - 1,
            progress: status == "finished" ? 100 : progress,
            status: status,
            variation: this.variation
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

    async endTest() {

        if (this.isQuiet) return


        this.page++
        await this.updateProgress("finished")

        await this.saveInBucket()

    }

    saveInBucket = async () => {
        try {
            const cloneSteps = this.steps.slice().sort((a, b) => a[0] - b[0] || a[12] - b[12])
            this.steps = []
            await new Storage()
                .bucket('simulations-tradingbot')
                .file(`simulation${this.simulationId}-${this.variation}/${this.page}.csv`)
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

            await promises.mkdir(`spot/${pair}/${unit}`, { recursive: true })
            promises.writeFile(`spot/${pair}/${unit}/${date}.csv`, historyArray.map(e => e.join(',')).join('\n'), { })
            // await new Storage()
            //     .bucket('crypto-history')
            //     .file(`spot/${pair}/${unit}/${date}.csv`)
            //     .save(, { resumable: false })
            //     .then(console.log)
            //     .catch(console.log);

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

            return file.toString().split("\n")
                .map(x => x.split(",")
                    .map(y => parseFloat(y)))
        } catch (e: any) {
            if (!e.message.includes("no such file")) {
                console.error(e.message)
            }
            return null

        }
    }

}