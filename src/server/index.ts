import amqp from 'amqplib'
import { publishJSON, SimpleQueueType } from '../internal/pubsub/publish.js';
import { ExchangePerilDirect, ExchangePerilTopic, GameLogSlug, PauseKey } from '../internal/routing/routing.js';
import { getInput, printServerHelp } from '../internal/gamelogic/gamelogic.js';
import { subscribeMsgPack } from '../internal/pubsub/consume.js';
import { handlerLog } from './handlers.js';

async function main() {
  const connectionString: string = "amqp://guest:guest@localhost:5672/"

  // Connect to Rabbit server
  console.log("Starting Peril server...");
  const conn = await amqp.connect(connectionString)
  console.log("Connected to Peril server!");

  ["SIGINT", "SIGTERM"].forEach((signal) =>
    process.on(signal, async () => {
      try {
        await conn.close();
        console.log("RabbitMQ connection closed.");
      } catch (err) {
        console.error("Error closing RabbitMQ connection:", err);
      } finally {
        process.exit(0);
      }
    }),
  );

  // Confirm channel
  const confirmChannel = await conn.createConfirmChannel()

  // Subscribe to game logs
  await subscribeMsgPack(
    conn,
    ExchangePerilTopic,
    GameLogSlug,
    `${GameLogSlug}.*`,
    SimpleQueueType.Durable,
    handlerLog()
  )

  // Display server help
  printServerHelp()

  while (true) {
    // Get input from user
    const words = await getInput('> ')
    if (words.length === 0) {
      continue
    }

    // Evaluate and process input
    const firstWord = words[0]
    if (firstWord === "pause") {
      console.log("Publishing paused game state");
      await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, { isPaused: true })
    } else if (firstWord === "resume") {
      console.log("Publishing resumed game state");
      await publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, { isPaused: false })
    } else if (firstWord === "quit") {
      console.log('Server shutting down...')
      break
    } else {
      console.log('Invalid command')
    }

  }

}


main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
