import React, {createContext, useEffect, useState} from 'react'
import io from 'socket.io-client';
import { WS_BASE } from '../config';

const WebSocketContext = createContext(null)

export { WebSocketContext }


// Этот компонент "обертка" отвечает за сокеты, как его правильно перевести во вью я без понятия
// Но по сути он просто открывает сокеты и обменивается сообщениями с сервером
// Я думаю проще будет просто взять логику сокетов и адаптировать под вью не обращая внимания на реакт
// суть простая - отправка событий по сокету в нужное время

export const WebsocketProvider = ({ children }) => {

  // следющие две строки это состояние
  // ws это объект в который передаются состояния/методы сокетов
  // и который через провайдера доступен в других компонентах
  // socket объект socket.io - открытый сокет
  const [ws, setWs] = useState()
  const [socket, setSocket] = useState()

  // методы отправки сообщений по сокету
  const sendNewReceiver = (data) => socket.emit("NewClientReceiver", data);
  const sendNewStreamer = () => socket.emit("NewClientStreamer");
  const sendNewOffer = (data) => socket.emit("Offer", data);
  const sendNewAnswer = (data) => socket.emit("ClientAnswer", data);

  // useEffect -  https://reactjs.org/docs/hooks-effect.html
  // срабатывает когда меняется состояние записанное в квадратные скобки
  // если пустые то срабатывает только раз при первой загрузке страницы
  // тут идет подключение сокета
  useEffect(()=>{
    if (!socket) {
      console.log('новый сокет');
      setSocket(io(WS_BASE, {
        // path: '/websocket',
        transports: ["websocket"]
      }))
    }
  }, [])

  // тут при каждом обновлении состояния socket обновляется состояние объекта ws
  // который используется в основном компоненте
  useEffect(()=>{
    if(socket){

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