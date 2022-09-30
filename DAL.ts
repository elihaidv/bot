import { MongoClient,ObjectId } from "mongodb";
import { Bot, Signaling } from "./Models";
const DB = require('./DB')

const uri = DB.USERNAME ?
    `mongodb://${DB.USERNAME}:${DB.PASSWORD}@${DB.ADDRESS}?writeConcern=majority` :
    `mongodb://127.0.0.1:27017/trading_bot?writeConcern=majority`;

export class DAL {
    static instance = new DAL()
    dbo
    currentTestId
    started

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


    async addSignaling(bot: Bot, signaling:Signaling) {
        await this.dbo.collection('bot').updateOne({ _id: bot._id }, { $push: { signalings: signaling } })
        bot.signalings.push(signaling)
      }

    removeSignaling(bot: Bot, signaling: Signaling) {
        this.dbo.collection('bot').updateOne({ _id: bot._id }, { $pull: { signalings: { _id: signaling._id } } })
        bot.signalings = bot.signalings.filter(s => s._id != signaling._id)    
    }
}