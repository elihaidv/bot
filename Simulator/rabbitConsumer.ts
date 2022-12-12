import { run } from "./Simulate";

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://simulator:sim1234@itamars.live/simulator', function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'simulations';

    channel.assertQueue(queue, {
      durable: false
    });

    channel.prefetch(1);
    channel.consume(queue, async function (msg) {
      try {
        const args = JSON.parse(msg.content.toString());
        await run(args.simulationId, args.variation, args.start, args.end)
        channel.ack(msg);
      } catch (e) {
        channel.ack(msg);
      }

    }, {
      noAck: false
    });
  });
});