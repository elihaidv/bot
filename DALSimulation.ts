import { DataManager } from "./Simulator/DataManager";
import fetch from 'node-fetch';
import { Storage } from "@google-cloud/storage";
import { exit } from "process";

const PAGE_SIZE = 2000
export class DAL {
    static instance = new DAL()
    started
    dataManager
    steps = Array<Array<any>>()
    stepsCounts = 0
    page = 0
    simulationId
    awaiter = false

    async init(dataManager: DataManager | null, simulationId) {
        this.dataManager = dataManager
        this.simulationId = simulationId
    }

    async logStep(step) {
        if (this.isQuiet) return

        step.time = this.dataManager.chart[this.dataManager.currentCandle].time
        const stepArr = [step.time, step.type, step.side, step.price, step.quantity, step.low, step.high, step.balanceSecond, step.positionSize, step.positionPnl, step.profit, step.balanceFirst, step.priority]

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

        const start = new Date(process.argv[4]).getTime()
        const end = new Date(process.argv[5]).getTime()
        const time = this.dataManager.chart[this.dataManager.currentCandle].time
        const progress = Math.round((time - start) / (end - start) * 100)

        const data = JSON.stringify({
            profit: Number((this.dataManager.profit / 100).toPrecision(2)) + "%",
            maxPage: this.page - 1,
            progress: status == "finished" ? 100 : progress,
            status: status
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
            .catch(console.log)
    }

    get isQuiet() {
        return process.argv[6] == 'quiet'
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
                .file(`simulation${process.argv[3]}/${this.page}.csv`)
                .save(cloneSteps
                    .map(s => s.join(','))
                    .join('\n'), { resumable: false })
                .then(console.log)
                .catch(console.log);
        } catch (e) {
            console.log(e)
        }
    }

}