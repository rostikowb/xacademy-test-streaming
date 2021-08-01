import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import Peer from "simple-peer"
import s from './global.module.css'
import {WebSocketContext} from "../sockets/websocket";
import getusermedia from "getusermedia";
import {VideoStreamMerger} from "video-stream-merger";
import {CONFIG_PEER} from "../config";


export const Index = () => {
  const [peerC, setPeerC] = useState()
  const peerS = useMemo(() => new Peer({initiator: false, config: CONFIG_PEER}), [])
  const [cam, setCam] = useState()
  const [screen, setScreen] = useState()
  const [streamC, setStreamC] = useState()
  const [alreadyStream, setAlreadyStream] = useState({cam: false, screen: false})
  const [streamS, setStreamS] = useState()
  const [merger] = useState(new VideoStreamMerger())
  const [gotAnswer, setGotAnswer] = useState(false)
  const peerAnswer = useSelector(state => state.main.peerAnswer);
  const peerOffer = useSelector(state => state.main.peerOffer);
  const videoTagS = useRef()
  const videoTagC = useRef()


  const ws = useContext(WebSocketContext);

  const peerCStart = (stream) => {
    const peer = new Peer({
      initiator: true,
      config: CONFIG_PEER,
      stream,
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
      // console.log(peerAnswer.tmp);
      try {
        peerC.signal(peerAnswer.tmp)
      } catch (e) {

      }
    }
  }, [peerAnswer, peerC])

  useEffect(() => {
    if (peerOffer.tmp) {
      peerS.signal(peerOffer.tmp)
    }
  }, [peerOffer, peerS])

  useEffect(() => {
    if (!ws) return;
    peerS.on('stream', (stream) => {
      console.log('stream from server');
      videoTagS.current.srcObject = stream
      videoTagS.current.play()
    })
    peerS.on('signal', (data) => {
      ws.sendNewAnswer(data)
    })
    peerS.on('close', () => {
      setPeerC(null);
    })
  }, [ws, peerS])


  const getWebCam = async () => {
    const data = await new Promise(resolve => getusermedia({video: true, audio: true}, (err, webcamStream) => {
      resolve(webcamStream)
    }))
    setCam(data)
    return data
  }

  const getScreen = async () => {
    try {
      const data = await navigator.mediaDevices.getDisplayMedia()
      setScreen(data)
      return data
    } catch (e) {
      return false;
    }
  }

  const addStreamToPeer = (stream) => {
    if (!peerC) {
      ws.sendNewStreamer()
      peerCStart(stream)
    } else {
      try {
        peerC.addStream(stream)
      } catch (e) {
      }
    }
  }

  const handleStartCamStream = async () => {

    if (alreadyStream.cam) return;

    if (!alreadyStream.screen) {
      const webcamStream = await getWebCam();
      if (!webcamStream) return;

      merger.start()
      merger.addStream(webcamStream)
      setStreamC(merger.result)
      addStreamToPeer(merger.result)
      setAlreadyStream({...alreadyStream, cam: true})
    } else {
      await startCamAndScreen(streamC, 'screen')
    }


  }


  const handleStartScreenCapture = async () => {
    if (alreadyStream.screen) return;

    if (!alreadyStream.cam) {
      const screenStream = await getScreen();
      if (!screenStream) return;
      merger.start()
      merger.addStream(screenStream)
      setStreamC(merger.result)

      addStreamToPeer(merger.result)
      setAlreadyStream({...alreadyStream, screen: true})
    } else {
      await startCamAndScreen(streamC, 'cam')
    }

  }

  const startCamAndScreen = async (streamRm) => {
    let Cam, Screen
    if (cam) Cam = cam;
    else Cam = await getWebCam();
    if (screen) Screen = screen;
    else Screen = await getScreen()

    if (!Cam || !Screen) return;

    setAlreadyStream({cam: true, screen: true})

    merger.addStream(Screen, {
      x: 0,
      y: 0,
      width: merger.width,
      height: merger.height,
      mute: true
    })

    merger.addStream(Cam, {
      x: merger.width - 150,
      y: merger.height - 150,
      width: 150,
      height: 150,
      mute: false
    })

    try {
      merger.removeStream(streamRm)
    } catch (e) {
      console.log(e);
    }


    merger.start()
    const stream = merger.result;
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

  useEffect(() => {
    if (streamC) {
      try {
        videoTagC.current.srcObject = streamC
        videoTagC.current.play()
      } catch (e) {

      }
    }
  }, [streamC])

  // useEffect(() => {
  //   if (streamCamC) peerS.addStream(streamS);
  // }, [streamS])


  const handleWatchStream = async () => {
    ws.sendNewReceiver()
  }

  const stopBothVideoAndAudio = (stream) => {
    try {
      stream.getTracks().forEach(track => track.stop())
    }catch (e) {

    }
  }

  const handleStopStream = (stream) => {
    try {
      if (peerC || peerS) {
        stopBothVideoAndAudio(stream);
        stopBothVideoAndAudio(streamC);
        stopBothVideoAndAudio(cam);
        stopBothVideoAndAudio(screen);
        peerC.removeStream(streamC);
      }
      // setAlreadyStream({cam: false, screen: false})
      if (streamC || streamS) {
        videoTagC.current.pause()
        videoTagS.current.srcObject = null;
        videoTagC.current.srcObject = null;
        videoTagC.current.src = '';

        setStreamS(undefined);
      }
    } catch (e) {

    }
  }


  const handleStopCamStream = () => {
    setAlreadyStream({...alreadyStream, cam: false})
    if (!alreadyStream.screen) handleStopStream(cam)
    else {
      merger.addStream(screen)
      merger.removeStream(streamC);
    }
  }

  const handleStopScreenStream = () => {
    setAlreadyStream({...alreadyStream, screen: false})
    if (!alreadyStream.cam) handleStopStream(screen)
    else {
      merger.addStream(cam)
      merger.removeStream(streamC);
    }
  }

  return <div className={s.main}>

    <div className={s.videoBox}>
      <video ref={videoTagS}/>
    </div>

    <div className={s.videoCStrimBox}>
      <video ref={videoTagC}/>
    </div>

    <div className={s.botom}>
      <button
        onClick={alreadyStream.cam ? handleStopCamStream : handleStartCamStream}>{alreadyStream.cam ? "ВЫКЛ КАМЕРУ" : "СТРИМИТЬ"}</button>
      <button
        onClick={alreadyStream.screen ? handleStopScreenStream : handleStartScreenCapture}>{alreadyStream.screen ? "ВЫКЛ ПОКАЗ ЭКРАНА" : "ПОКАЗАТЬ ЭКРАН"}</button>
      <button onClick={handleWatchStream}>СМОТРЕТЬ</button>
      <button onClick={handleStopStream}>СТОП</button>
    </div>

  </div>
}
