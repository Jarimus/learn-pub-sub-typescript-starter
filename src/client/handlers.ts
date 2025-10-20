import type { ArmyMove, RecognitionOfWar } from "../internal/gamelogic/gamedata.js";
import { getInput } from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { publishJSON } from "../internal/pubsub/publish.js";
import { AckType } from "../internal/pubsub/consume.js";
import amqp from 'amqplib'
import { ExchangePerilTopic, WarRecognitionsPrefix } from "../internal/routing/routing.js";
import { handleWar, WarOutcome } from "../internal/gamelogic/war.js";
import { publishGameLog } from "./index.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => AckType {
  return (ps: PlayingState) => {
    handlePause(gs, ps)
    getInput()
    console.log('acked')
    return AckType.Ack
  }
}

export function handlerMove(gs: GameState, ch: amqp.ConfirmChannel): (move: ArmyMove) => AckType {
  return (move: ArmyMove) => {
    const outcome = handleMove(gs, move)
    switch (outcome) {
      case MoveOutcome.Safe:
        console.log('acked')
        return AckType.Ack

      case MoveOutcome.MakeWar:
        const recognition: RecognitionOfWar = {
          attacker: move.player,
          defender: gs.getPlayerSnap(),
        };
        try {
          publishJSON(ch, ExchangePerilTopic, `${WarRecognitionsPrefix}.${gs.getPlayerSnap().username}`, recognition)
          console.log('acked')
          return AckType.Ack
        } catch {
          console.log('nackRequeued')
          return AckType.NackRequeue
        }

      case MoveOutcome.SamePlayer:
        console.log('nackdiscarded')
        return AckType.NackDiscard

      default:
        console.log('nackdiscarded')
        return AckType.NackDiscard
    }
  }
}

export function handlerWar(gs: GameState, ch: amqp.ConfirmChannel): (rw: RecognitionOfWar) => AckType {
  return (rw: RecognitionOfWar) => {
    console.log(rw)
    try {
      const resolution = handleWar(gs, rw)
      switch (resolution.result) {
        case WarOutcome.NotInvolved:
          console.log('nackRequeued')
          return AckType.NackRequeue
  
        case WarOutcome.NoUnits:
          console.log('nackDiscarded')
          return AckType.NackDiscard
        
        case WarOutcome.OpponentWon:
        case WarOutcome.YouWon:
          try {
            publishGameLog(ch, gs.getPlayerSnap().username, `${resolution.winner} won a war against ${resolution.loser}`)
            return AckType.Ack
          } catch {
            return AckType.NackRequeue
          }
        case WarOutcome.Draw:
          try {
            publishGameLog(ch, gs.getPlayerSnap().username, `A war between ${resolution.attacker} and ${resolution.defender} resulted in a draw`)
            return AckType.Ack
          } catch {
            return AckType.NackRequeue
          }
        default:
          console.error('error handing war outcome')
          return AckType.NackDiscard
      }
    } finally {
      process.stdout.write("> ");
    }
  }
}