import React, {useContext, useEffect, useRef, useState} from "react";
import {useSelector} from "react-redux";
import Peer from "simple-peer"
import s from './global.module.css'
import {WebSocketContext} from "../sockets/websocket";

export const Index = () => {
  const [peerC, setPeerC] = useState()
  const [peerS] = useState()
  const [streamC, setStreamC] = useState()
  const [streamS, setStreamS] = useState()
  const [gotAnswer, setGotAnswer] = useState(false)
  const peerAnswer = useSelector(state => state.main.peerAnswer);
  const peerOffer = useSelector(state => state.main.peerOffer);
  const videoTagS = useRef()
  const videoTagC = useRef()


  const ws = useContext(WebSocketContext);

  const peerCStart = (stream) => {
    const peer = new Peer({
      initiator: true,
      stream: stream,
    })
    setPeerC(peer)

    peer.on('signal', data => {
      if (!gotAnswer) ws.sendNewOffer(data);
    })
    peer.on('connect', data => {
      // peerC.signal(data)
      console.log('connect');
      peer.send('test connect - OK')
    })

  }

  useEffect(() => {
    if (peerAnswer.tmp) {
      setGotAnswer(true)
      console.log(peerAnswer.tmp);
      peerC.signal(peerAnswer.tmp)
    }
  }, [peerAnswer])

  useEffect(() => {
    if (peerOffer.tmp) {
      let peer = new Peer({
        initiator: false,
      })
      peer.on('stream', function (stream) {
        videoTagS.current.srcObject = stream
        videoTagS.current.play()
      })
      peer.on('signal', function (data) {
        ws.sendNewAnswer(data)
      })
      peer.signal(peerOffer.tmp)
    }
  }, [peerOffer])

  const stopBothVideoAndAudio = (stream) => {
    stream.getTracks().forEach((track) => {
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
    ws.sendNewStreamer()
    setStreamC(stream)

    peerCStart(stream)
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

  useEffect(() => {
    if (streamC) {
      videoTagC.current.srcObject = streamC
      videoTagC.current.play()
    }
  }, [streamC])

  useEffect(() => {
    if (streamC) peerS.addStream(streamS);
  }, [streamS])

  const handleStartStream = async () => {
    await newStreamCamVoice()
  }

  const handleWatchStream = async () => {
    ws.sendNewReceiver()
  }

  const handleStopStream = () => {
    if (peerC || peerS) {
      peerC.removeStream(streamC);
      stopBothVideoAndAudio(streamC);
    }

    if (streamC || streamS)
      videoTagS.current.srcObject = null;
    videoTagC.current.srcObject = null;
    setStreamC(undefined);
    setStreamS(undefined);

  }


  return <div className={s.main}>

    <div className={s.videoBox}>
      <video ref={videoTagS}/>
    </div>

    <div className={s.videoCStrimBox}>
      <video ref={videoTagC}/>
    </div>

    <div className={s.botom}>
      <button onClick={handleStartStream}>СТРИМИТЬ</button>
      <button onClick={handleWatchStream}>СМОТРЕТЬ</button>
      <button onClick={handleStopStream}>СТОП</button>
    </div>

  </div>
}
