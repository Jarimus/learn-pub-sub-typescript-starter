import amqp from 'amqplib'
import { publishJSON } from '../internal/pubsub/publish.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';
import { printServerHelp } from '../internal/gamelogic/gamelogic.js';

async function main() {
  const connectionString: string = "amqp://guest:guest@localhost:5672/"

  // Connect to Rabbit server
  console.log("Starting Peril server...");
  const conn = await amqp.connect(connectionString)
  console.log("Connected to Peril server!")

  // Confirm channel
  const confirmChannel = await conn.createConfirmChannel()
  publishJSON(confirmChannel, ExchangePerilDirect, PauseKey, { isPaused: true })

  // Display server help
  printServerHelp()

  // Wait for shutdown signal
  process.on('exit', (code) => {
  console.log('Server shutting down...')
  conn.close()
});
}


main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
