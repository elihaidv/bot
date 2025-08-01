cd ~/Downloads
ssh trading 'mongoexport -d trading -c key > dump/key.json'
ssh trading 'mongoexport -d trading -c bot > dump/bot.json'
ssh trading 'mongoexport -d trading -c tests > dump/simulations.json'
ssh trading 'mongoexport -d trading -c bot_types > dump/bot_types.json'

# ssh trading 'mongodump -u elihai --authenticationDatabase admin --password eldv1993 -d trading_bot -c tests'
scp -r trading:dump .
# mongorestore --drop
# mongosh trading_bot --eval 'db.bot.updateMany({}, {"$set":{"run":"0", "enviroment":"LOCAL"}})'