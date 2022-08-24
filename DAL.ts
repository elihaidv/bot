


import { MongoClient } from "mongodb";
import { DataManager } from "./Simulator/DataManager";
const DB = require('./DB')

const uri = DB.USERNAME ?
    `mongodb://${DB.USERNAME}:${DB.PASSWORD}@${DB.ADDRESS}?writeConcern=majority` :
    `mongodb://127.0.0.1:27017/trading_bot?writeConcern=majority`;

export class DAL {
    static instance = new DAL()
    dbo
    currentTestId
    started
    dataManager

    async init(dataManager:DataManager|null) {
        let db = await MongoClient.connect(uri)
        this.dbo = db.db("trading_bot")
        this.dataManager = dataManager
    }

    getBots() {
        return this.dbo.collection('bot').find({ run: true, stream: '1', enviroment: DB.ENVIROMENT }).toArray()
    }
    getKeys() {
        return this.dbo.collection('key').find({}).toArray()
    }

    logError(error) {
        this.dbo.collection('error').insertOne(error)
    }

    async createTest(test) {
        const clone = (({ binance,_id,profit, ...o }) => o)(test)
        this.started = new Date()
        clone.startAt = this.started
        clone.bot_id = test._id.toString()
        clone.status = 'running'
        let currentTest = await this.dbo.collection('tests').insertOne(clone)
        this.currentTestId = currentTest.insertedId
        
    }

    async startTest(test) {
        this.currentTestId = test._id
        this.started = new Date()

        await this.dbo.collection('tests').updateOne(
            { "_id": this.currentTestId },
            { "$set": { 
                status: 'running',
                startAt: this.started,

             }}
        )      
    }
    async logStep(step) {
        step.time = this.dataManager.chart[this.dataManager.time].time
        
        await this.dbo.collection('tests').updateOne(
            { "_id": this.currentTestId },
            { "$push": { "logs": step }}
        )
    }

    async setFields(fields) {
        await this.dbo.collection('tests').updateOne(
            { "_id": this.currentTestId },
            { "$set": fields }
        )
    }

    async endTest(profit) {
        await this.dbo.collection('tests').updateOne(
            { "_id": this.currentTestId },
            { "$set": {
                profit:  Number((profit / 100).toPrecision(2)) + "%",
                status: 'finished',
                time: ((new Date().getTime() - this.started.getTime()) / 1000).toFixed()
            } }
        )
    }
}