import {PEER_ANSWER, PEER_OFFER} from "../types";

const initialState = {
  peerAnswer: {},
  peerOffer: {}
};

export const main = (state = initialState, action) => {
  switch (action.type) {
    case PEER_ANSWER: {
      const tmp = action.update;
      state.peerAnswer = {...state.peerAnswer, tmp};
      return {...state}
    }
    case PEER_OFFER: {
      const tmp = action.update;
      state.peerOffer = {...state.peerOffer, tmp};
      return {...state}
    }
    default:
      return state;
  }
};
