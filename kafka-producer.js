var amqp = require('amqplib/callback_api');

amqp.connect('amqp://localhost', function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function(error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'hello';
    var msg = 'Hello world';

    channel.assertQueue(queue, {
      durable: false
    });

    let i = 0;
    setInterval(() => {
    channel.sendToQueue(queue, Buffer.from(msg + i++));
    console.log(" [x] Sent %s", i);
    }, 1000);
  });
});