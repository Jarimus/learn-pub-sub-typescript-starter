import amqp from "amqplib";
import {
  clientWelcome,
  commandStatus,
  getInput,
  getMaliciousLog,
  printClientHelp,
  printQuit,
} from "../internal/gamelogic/gamelogic.js";
import { publishJSON, publishMsgPack, SimpleQueueType } from "../internal/pubsub/publish.js";
import { ArmyMovesPrefix, ExchangePerilDirect, ExchangePerilTopic, GameLogSlug, PauseKey, WarRecognitionsPrefix } from "../internal/routing/routing.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import { commandSpawn } from "../internal/gamelogic/spawn.js";
import { commandMove } from "../internal/gamelogic/move.js";
import { declareAndBind, subscribeJSON } from "../internal/pubsub/consume.js";
import { handlerMove, handlerPause, handlerWar } from "./handlers.js";
import type { GameLog } from "../internal/gamelogic/logs.js";

async function main() {
  const connectionString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(connectionString);
  console.log("Peril game client connected to RabbitMQ!");

  // Open channel
  const channel = await conn.createConfirmChannel();

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

  const username = await clientWelcome();

  await declareAndBind(
    conn,
    ExchangePerilDirect,
    `${PauseKey}.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
  );

  // Create gamestate
  const gs = new GameState(username);

  // Subscribe to user's pause queue
  await subscribeJSON(
    conn,
    ExchangePerilDirect,
    `${PauseKey}.${username}`,
    PauseKey,
    SimpleQueueType.Transient,
    handlerPause(gs)
  )

  // Subscribe to army moves
  await subscribeJSON(
    conn,
    ExchangePerilTopic,
    `${ArmyMovesPrefix}.${username}`,
    `${ArmyMovesPrefix}.*`,
    SimpleQueueType.Transient,
    handlerMove(gs, channel)
  )

  // Subscribe to war resolutions
  await subscribeJSON(
    conn,
    ExchangePerilTopic,
    `${WarRecognitionsPrefix}`,
    `${WarRecognitionsPrefix}.*`,
    SimpleQueueType.Durable,
    handlerWar(gs, channel)
  )

  while (true) {
    const words = await getInput();
    if (words.length === 0) {
      continue;
    }
    const command = words[0];
    if (command === "move") {
      try {
        const move = commandMove(gs, words);
        publishJSON(channel, ExchangePerilTopic, `${ArmyMovesPrefix}.${username}`, move)
        console.log('Move published successfully!')
      } catch (err) {
        console.log((err as Error).message);
      }
    } else if (command === "status") {
      commandStatus(gs);
    } else if (command === "spawn") {
      try {
        commandSpawn(gs, words);
      } catch (err) {
        console.log((err as Error).message);
      }
    } else if (command === "help") {
      printClientHelp();
    } else if (command === "quit") {
      printQuit();
      process.exit(0);
    } else if (command === "spam") {
      if (words.length < 2) {
        console.log('Not enough arguments: spam <number>')
        continue
      }
      if (words.length > 2) {
        console.log('Too many arguments: spam <number>')
        continue
      }
      let n: number
      n = Number(words[1])
      if (Number.isNaN(n) ) {
        console.log('Provide a valid number for spam')
        continue
      }
      for (let i=0; i < n; i++) {
        const username = gs.getPlayerSnap().username
        const msg = getMaliciousLog()
        const log: GameLog = {
          currentTime: new Date(),
          message: msg,
          username: username
        }
        await publishMsgPack(channel, ExchangePerilTopic, `${GameLogSlug}.${username}`, log)
      }
    } else {
      console.log("Unknown command");
      continue;
    }
  }
}

export function publishGameLog(ch: amqp.ConfirmChannel, username: string, message: string) {
  const gameLog: GameLog = {
    currentTime: new Date(),
    message: message,
    username: username
  }
  publishMsgPack(
    ch,
    ExchangePerilTopic,
    `${GameLogSlug}.${username}`,
    gameLog
  )
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
