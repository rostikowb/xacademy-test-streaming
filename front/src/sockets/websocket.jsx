import React, {createContext, useEffect, useState} from 'react'
import io from 'socket.io-client';
import { WS_BASE } from '../config';
import { useDispatch } from 'react-redux';
import {answerServer, offerServer} from '../redux/actions/action';

const WebSocketContext = createContext(null)

export { WebSocketContext }

export const WebsocketProvider = ({ children }) => {

  const [ws, setWs] = useState()
  const [socket, setSocket] = useState()
  const dispatch = useDispatch();
  const sendNewReceiver = () => socket.emit("NewClientReceiver");
  const sendNewStreamer = () => socket.emit("NewClientStreamer");
  const sendNewOffer = (data) => socket.emit("Offer", data);
  const sendNewAnswer = (data) => socket.emit("ClientAnswer", data);

  useEffect(()=>{
    if (!socket) {
      console.log('новый сокет');
      setSocket(io(WS_BASE, {
        transports: ["websocket"]
      }))
    }
  }, [])

  useEffect(()=>{
    if(socket){
      socket.on("Answer", (msg) => dispatch(answerServer(msg)))
      socket.on("Offer", (msg) => dispatch(offerServer(msg)))

      setWs({
        socket,
        sendNewStreamer,
        sendNewOffer,
        sendNewReceiver,
        sendNewAnswer
      })
    }
  }, [socket])


  return (
    <WebSocketContext.Provider value={ws}>
      {children}
    </WebSocketContext.Provider>
  )
}