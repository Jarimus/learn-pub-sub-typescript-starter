import amqp from 'amqplib'
import { clientWelcome } from '../internal/gamelogic/gamelogic.js';
import { declareAndBind } from '../internal/pubsub/publish.js';
import { ExchangePerilDirect, PauseKey } from '../internal/routing/routing.js';

async function main() {
  const connectionString: string = "amqp://guest:guest@localhost:5672/"

  console.log("Starting Peril client...");
  // Connect to RabbitMQ
  const conn = await amqp.connect(connectionString)

  const user = await clientWelcome()

  // Declare and bind
  const [channel, queue] = await declareAndBind(conn, ExchangePerilDirect, `${PauseKey}.${user}`, PauseKey, "transient")

  // Wait for shutdown signal
  process.on('exit', (code) => {
  console.log('Client shutting down...')
  conn.close()
  })
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
