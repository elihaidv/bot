import pkg from 'mongodb';
const { MongoClient } = pkg;
import { Bot, Signaling } from "./Models";
import DB from "./DB.js"

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
        this.dbo = db.db("trading")
    }

    getBots() {
        return this.dbo.collection('bot').find({ run: true, stream: '1', enviroment: DB.ENVIROMENT }).toArray()
    }
    getKeys() {
        return this.dbo.collection('key').find({}).toArray()
    }

    logError(error) {
        // this.dbo.collection('error').insertOne(error)
    }


    async addSignaling(bot: Bot, signaling:Signaling) {
        bot.signalings.push(signaling)
        await this.dbo.collection('bot').updateOne({ _id: bot._id }, { $push: { signalings: signaling } })
      }

    removeSignaling(bot: Bot, signalingID:String) {
        this.dbo.collection('bot').updateOne({ _id: bot._id }, { $pull: { signalings: { _id: signalingID} } })
        bot.signalings = bot.signalings.filter(s => s._id != signalingID)    
    }
}