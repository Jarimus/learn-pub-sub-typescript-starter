import { writeLog, type GameLog } from "../internal/gamelogic/logs.js"
import { AckType } from "../internal/pubsub/consume.js";

export function handlerLog(): (gameLog: GameLog) => Promise<AckType> {
  return async (gameLog: GameLog) => {
    try {
      await writeLog(gameLog)
      console.log('log written')
      return AckType.Ack
    } catch {
      return AckType.NackDiscard
    } finally {
      process.stdout.write("> ");
    }
  }
}