import React, {useContext, useEffect, useRef, useState} from "react";
import {useSelector} from "react-redux";
import s from './global.module.css'
import {WebSocketContext} from "../sockets/websocket";

export const Index = () => {

  const [newMsg, setNewMsg] = useState('')
  const [online, setOnline] = useState(0)
  const [streamC, setStreamC] = useState()
  const [streamS, setStreamS] = useState()
  // const [videoSrc, setVideoSrc] = useState('')
  const chats = useSelector(state => state.main.chatLog);
  const connections = useSelector(state => state.main.connections);
  const videoTagS = useRef()
  const videoTagC = useRef()

  useEffect(() => {
    let tmp = 0;
    for (let key in connections) {
      tmp += connections[key]
    }
    // console.log(tmp);
    setOnline(tmp || 0)
  }, [connections])

  // useEffect(() => {
  //   scrollToBottom()
  // }, [chats])

  useEffect(() => {
    // peerS.on('signal', data => {
    //   peerS.signal(data)
    // })
    //
    // peerS.on('signal', data => {
    //   peerC.signal(data)
    // })
    //
    // peerS.on('stream', stream => {
    //   console.log('videoTag', videoTagS);
    //   videoTagS.current.srcObject = stream
    //   // setVideoSrc(window.URL.createObjectURL(stream))
    //   videoTagS.current.play()
    // })

    // peerC.on('signal', data => {
    //   peerC.signal(data)
    // })
    //
    // peerC.on('signal', data => {
    //   peerS.signal(data)
    // })
    //
    // peerC.on('stream', stream => {
    //   console.log('sdsdsdsd');
    //   console.log('videoTag', videoTagC);
    //   videoTagC.current.srcObject = stream
    //   // setVideoSrc(window.URL.createObjectURL(stream))
    //   videoTagC.current.play()
    // })

  }, [])


  const ws = useContext(WebSocketContext);

  const handleInput = (e) => {
    setNewMsg(e.target.value)
  }

  const handleSend = () => {
    if (newMsg) ws.sendMessage(newMsg);
    setNewMsg('')
  }

  const _handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  const stopBothVideoAndAudio = (stream) => {
    stream.getTracks().forEach((track)=> {
      if (track.readyState === 'live') {
        track.stop();
      }
    });
  }

  const newStreamCamVoice = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    console.log(stream);
    setStreamC(stream)
  }

//   // stop only camera
//   function stopVideoOnly(stream) {
//     stream.getTracks().forEach(function(track) {
//       if (track.readyState == 'live' && track.kind === 'video') {
//         track.stop();
//       }
//     });
//   }
//
// // stop only mic
//   function stopAudioOnly(stream) {
//     stream.getTracks().forEach(function(track) {
//       if (track.readyState == 'live' && track.kind === 'audio') {
//         track.stop();
//       }
//     });
//   }

  // useEffect(()=>{
  //   if (streamC) {
  //     peerC.addStream(streamC);
  //     videoTagC.current.srcObject = streamC
  //     // setVideoSrc(window.URL.createObjectURL(stream))
  //     videoTagC.current.play()
  //   }
  // }, [streamC])
  //
  // useEffect(()=>{
  //   if (streamC) peerS.addStream(streamS);
  // }, [streamS])

  const handleStartStream = async () => {
    await newStreamCamVoice()
  }

  const handleWatchStream = async () => {
    // await newStreamCamVoice()
  }

  const handleStopStream = () => {
    // if (peerC || peerS) {
    //   peerC.removeStream(streamC);
    //   stopBothVideoAndAudio(streamC);
    // }

    if (streamC || streamS)
      videoTagS.current.srcObject = null;
      videoTagC.current.srcObject = null;
      setStreamC(undefined);
      setStreamS(undefined);

  }



  // const messagesEndRef = React.createRef()

  // const scrollToBottom = () => {
  //   messagesEndRef.current.scrollIntoView({behavior: 'smooth'})
  // }

  return <div className={s.main}>
    {/*<div className={s.chatBox}>*/}
    {/*  <div className={s.chatBoxTop}></div>*/}
    {/*  {chats.length ? chats.map((item, i) => {*/}
    {/*    return <div key={item + i}>*/}
    {/*      {item.toString()}*/}
    {/*    </div>*/}
    {/*  }) : <div>Нет новых сообщений</div>}*/}
    {/*  <div ref={messagesEndRef}/>*/}
    {/*  <span className={s.connections}>Соединений: {online}</span>*/}
    {/*</div>*/}

    <div className={s.videoBox}>
      <video ref={videoTagS}/>
    </div>

    <div className={s.videoCStrimBox}>
      <video ref={videoTagC}/>
    </div>

    <div className={s.botom}>
    {/*  <input onKeyDown={_handleKeyDown} value={newMsg} onChange={handleInput} type="text" autofocus/>*/}
    {/*  <button onClick={handleSend}>Отправить</button>*/}
      <button onClick={handleStartStream}>СТРИМИТЬ</button>
      <button onClick={handleWatchStream}>СМОТРЕТЬ</button>
      <button onClick={handleStopStream}>СТОП</button>
    </div>

  </div>
}
