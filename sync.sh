cd ~/Downloads
ssh trading 'mongodump -u elihai --authenticationDatabase admin --password eldv1993 -d trading_bot -c key'
ssh trading 'mongodump -u elihai --authenticationDatabase admin --password eldv1993 -d trading_bot -c bot'
ssh trading 'mongodump -u elihai --authenticationDatabase admin --password eldv1993 -d trading_bot -c tests'
scp -r trading:dump .
mongorestore --drop
mongo trading_bot --eval 'db.bot.updateMany({}, {"$set":{"run":"0", "enviroment":"LOCAL"}})'