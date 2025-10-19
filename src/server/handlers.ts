import { writeLog, type GameLog } from "../internal/gamelogic/logs.js"
import { ackType } from "../internal/pubsub/consume.js";

export function handlerLog(): (gameLog: GameLog) => Promise<ackType> {
  return async (gameLog: GameLog) => {
    try {
      await writeLog(gameLog)
      console.log('log written')
      return ackType.Ack
    } catch {
      return ackType.NackDiscard
    } finally {
      process.stdout.write("> ");
    }
  }
}