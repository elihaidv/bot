


import { MongoClient } from "mongodb";
const DB = require('./DB')

const uri = DB.USERNAME ?
    `mongodb://${DB.USERNAME}:${DB.PASSWORD}@${DB.ADDRESS}?writeConcern=majority` :
    `mongodb://127.0.0.1:27017/trading_bot?writeConcern=majority`;

export class DAL {
    static instance = new DAL()
    dbo
    currentTest

    async init() {
        let db = await MongoClient.connect(uri)
        this.dbo = db.db("trading_bot")
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
        const clone = (({ binance,_id, ...o }) => o)(test)
        this.currentTest = await this.dbo.collection('tests').insertOne(clone)
        
    }

    async logStep(step) {
        await this.dbo.collection('tests').update(
            { "_id": this.currentTest._id },
            { "$push": { "logs": {"x":step} }}
        )
    }
}