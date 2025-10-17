import type { ArmyMove } from "../internal/gamelogic/gamedata.js";
import { getInput } from "../internal/gamelogic/gamelogic.js";
import { GameState } from "../internal/gamelogic/gamestate.js";
import type { PlayingState } from "../internal/gamelogic/gamestate.js";
import { handleMove, MoveOutcome } from "../internal/gamelogic/move.js";
import { handlePause } from "../internal/gamelogic/pause.js";
import { ackType } from "../internal/pubsub/subscribe.js";

export function handlerPause(gs: GameState): (ps: PlayingState) => ackType {
  return (ps: PlayingState) => {
    handlePause(gs, ps)
    getInput()
    console.log('acked')
    return ackType.Ack
  }
}

export function handlerMove(gs: GameState): (move: ArmyMove) => ackType {
  return (move: ArmyMove) => {
    const outcome = handleMove(gs, move)
    if (outcome === MoveOutcome.Safe ||outcome === MoveOutcome.MakeWar) {
      console.log('acked')
      return ackType.Ack
    } else if (outcome === MoveOutcome.SamePlayer) {
      console.log('nackdiscarded')
      return ackType.NackDiscard  
    } else {
      console.log('nackdiscarded')
      return ackType.NackDiscard
    }
    getInput()
  }
}