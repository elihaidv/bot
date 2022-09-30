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
        
        step.time = this.dataManager.chart[this.dataManager.time].time
        const stepArr = [step.time, step.type, step.side, step.price, step.quantity, step.low, step.high, step.balanceSecond, step.positionSize, step.positionPnl, step.profit, step.balanceFirst, step.priority]

        this.steps.push(stepArr)
        this.stepsCounts++

        if (Math.floor(this.stepsCounts / PAGE_SIZE) > this.page) {
            this.page++
            this.saveInBucket()
            this.awaiter = true
            await this.updateProgress("running")
          
        }

    }

     updateProgress(status) {
        const data = JSON.stringify({
                profit: Number((this.dataManager.profit / 100).toPrecision(2)) + "%",
                maxPage: this.page - 1,
                progress: status == "finished" ? 100 : ((this.dataManager.time / this.dataManager.chart.length) * 100),
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

    saveInBucket =  () => {
        const cloneSteps = this.steps.slice()
        this.steps = []
        new Storage()
            .bucket('simulations-tradingbot')
            .file(`simulation${process.argv[3]}/${this.page}.csv`)
            .save(cloneSteps
                .map(s => s.join(','))
                .join('\n'),{resumable: false})
                .catch(console.log);
        }
    
}