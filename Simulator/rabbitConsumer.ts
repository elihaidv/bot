import { run } from "./Simulate.js";
import fetch from 'node-fetch';

import amqp from 'amqplib/callback_api.js';
let lastSim: any = {}
let extChannel: any

amqp.connect('amqp://simulator:sim1234@itamars.live/simulator', {
  heartbeat: 120
}, function (error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var queue = 'simulationsPr';
    extChannel = channel

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
        lastSim = args
        console.log("Simulating: ", args.simulationId, args.variation, args.start, args.end)
        await run(args.simulationId, args.variation, args.start, args.end)
        channel.ack(msg);
        console.error("success");
      } catch (e) {
        console.error(e);
        channel.ack(msg);
        sendError(e)
      }

    }, {
      noAck: false
    });
  });
});

process.on('uncaughtException', function (err) {
  console.error(err);
  sendError(err)
  extChannel.ack(lastSim)
});

function sendError(err) {
  return fetch("https://itamars.live/api/simulations/" + lastSim.simulationId, {
    method: 'PUT',
    body: JSON.stringify({
      status: "error",
      error: err
    }),
    headers: {
      "API-KEY": "WkqrHeuts2mIOJHMcxoK",
      "Accept": "application/json",
      'Content-Type': 'application/json',
    }

  }).then(r => r.text())
    .then(console.log)
    .catch(console.error)
}