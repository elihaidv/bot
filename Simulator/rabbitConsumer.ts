import { run } from "./Simulate";

var amqp = require('amqplib/callback_api');

amqp.connect('amqp://simulator:sim1234@itamars.live/simulator', {
  heartbeat: 120
},function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'simulationsPr';

    channel.assertQueue(queue, {
      durable: false,
      arguments: {
        "x-max-priority": 10
      }
    });

    channel.prefetch(1);

    channel.consume(queue, async function (msg) {
      try {
        const args = JSON.parse(msg.content.toString());
        console.log("Simulating: ", args.simulationId, args.variation, args.start, args.end)
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