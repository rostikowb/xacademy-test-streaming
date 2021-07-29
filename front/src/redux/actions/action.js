import {PEER_ANSWER, PEER_OFFER} from "../types";

export function answerServer(update){
  return {
    type: PEER_ANSWER,
    update
  }
}

export function offerServer(update){
  return {
    type: PEER_OFFER,
    update
  }
}