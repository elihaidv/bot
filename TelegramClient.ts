import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage } from "telegram/events";
import input from "input";

const apiId = 708720;
const apiHash = "1e6f98056d5a7f5c6508b1a38478eb54";
const stringSession = new StringSession("1BAAOMTQ5LjE1NC4xNjcuOTEAUHIwmGyneJ1D1vODLBkJrLEI5uUPZ1W44dIsC/BY4d3vevWJXuaxQSgPZ6qpIqRUNx24dZEqEoS0oXDqDul7lVs2D89H7FYjUQgG/w9gLNP/BZmi5e3w4m3AGRI98o5SmDe8iO0LTIph8DwRfLowvChTksrhLeMUyBTgoriOFTnECbeptxDWhWuspFdHX6wEjKcRw7ce08atTH427f1a53MjZqZnvTPcSX5BZcecoWcHu5HqjVG40xsVzMSJC+I7uYL+CIhOvquH+o956Vb78qhTWQeBz0k8pwj0qLXLMtGPkoocEDLcr/DYEK06syUlb3x+IPsPW5d2q9PTsORJVsA="); // fill this later with the value from session.save()

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
//   console.log("You should now be connected.");
//   console.log(client.session.save()); // Save this string to avoid logging in again
//   await client.sendMessage("me", { message: "Hello!" });
  await client.addEventHandler(console.log, new NewMessage({}));
})();