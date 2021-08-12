import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import Peer from "simple-peer"
import s from './global.module.css'
import {WebSocketContext} from "../sockets/websocket";
import {VideoStreamMerger} from "video-stream-merger";
import {CONFIG_PEER} from "../config";

export const Index = () => {
  const [peerC, setPeerC] = useState()
  let peerS = useMemo(() => new Peer({initiator: false, config: CONFIG_PEER}), [])
  const [cam, setCam] = useState()
  const [audio, setAudio] = useState()
  const [screen, setScreen] = useState()
  const [streamC, setStreamC] = useState()
  const [streamS, setStreamS] = useState()
  const [isDisplayMainPlayer, setIsDisplayMainPlayer] = useState(false)
  const [isDisplaySmartPlayer, setIsDisplaySmartPlayer] = useState(false)
  const [alreadyStream, setAlreadyStream] = useState({cam: false, screen: false})
  const [voice, setVoice] = useState(true)
  const [merger, setMerger] = useState()
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
    if (merger?.result) {
      if (videoTagC?.current) videoTagC.current.srcObject = merger.result;
      else setIsDisplaySmartPlayer(true);
    }
  }, [merger?.result])

  useEffect(() => {
    if (isDisplaySmartPlayer) {
      videoTagC.current.srcObject = merger.result
      videoTagC.current.play()
    }

  }, [isDisplaySmartPlayer])

  useEffect(() => {
    if (isDisplayMainPlayer && streamS) {
      videoTagS.current.srcObject = streamS
      videoTagS.current.play()
    }

  }, [isDisplayMainPlayer, streamS])

  useEffect(() => {
    if (peerAnswer.tmp) {

      // console.log(peerAnswer.tmp);
      try {
        peerC.signal(peerAnswer.tmp)
        setGotAnswer(true)
      } catch (e) {
        console.log(e);
      }
    }
  }, [peerAnswer, peerC])

  useEffect(() => {
    if (peerOffer.tmp) {
      try {
        peerS.signal(peerOffer.tmp)
      } catch (e) {
      }
    }
  }, [peerOffer, peerS])

  useEffect(() => {
    if (!ws) return;

    peerS.on('stream', async (stream) => {
      console.log('stream from server');
      setStreamS(stream)
      // videoTagS.current.srcObject = stream
    })
    peerS.on('signal', (data) => {
      ws.sendNewAnswer(data)
    })
    peerS.on('close', () => {
      setPeerC(null);
    })
    peerS.on('error', (err) => {
      console.trace(err);
    })
  }, [ws, peerS])

  useEffect(() => {
    if (streamC) {
      (async () => {
        console.log(await videoTagC.current.play());
      })()
    }
  }, [streamC])

  const getAudio = async () => {
    const data = await navigator.mediaDevices.getUserMedia({audio: true})
    setAudio(data);
    return data
  }

  const getVideo = async () => {
    // const data = await new Promise(resolve => getusermedia({video: true, audio: true}, (err, webcamStream) => {
    //   resolve(webcamStream)
    // }))
    // console.log('data', data);
    const data = await navigator.mediaDevices.getUserMedia({video: true})
    setCam(data);
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

  const handleStartStream = async (type) => {
    if (alreadyStream[type]) return;
    let merg;
    if (!merger) {
      merg = new VideoStreamMerger()
      setMerger(merg)
    } else {
      merg = merger
    }

    if (!merg.result) merg.start();


    const audioStream = await getAudio();
    merg.addStream(audioStream)
    setIsDisplaySmartPlayer(true)

    if (alreadyStream.cam || alreadyStream.screen) {
      await startCamAndScreen(merg.result)
      return;
    }

    if (type === 'screen') {
      const screenStream = await getScreen();
      if (!screenStream || !audioStream) return;
      merg.addStream(screenStream)
    }

    if (type === 'cam') {
      const webcamStream = await getVideo();
      if (!webcamStream || !audioStream) return;
      merg.addStream(webcamStream, {
        x: 0,
        y: 0,
        width: merg.width,
        height: merg.height,
      })
    }
    addStreamToPeer(merg.result)
    setStreamC(merg.result)
    setAlreadyStream({...alreadyStream, [type]: true})
    console.log('merg', merg);
  }

  const startCamAndScreen = async (streamRm) => {
    let Cam, Screen, Audio
    if (cam) Cam = cam;
    else {
      Cam = await getVideo();
      setCam(Cam)
    }
    if (screen) Screen = screen;
    else {
      Screen = await getScreen()
      setScreen(Screen)
    }
    if (audio) Audio = audio;
    else {
      Audio = await getScreen()
      setAudio(Audio)
    }

    if (!Cam || !Screen) return;

    setAlreadyStream({cam: true, screen: true})
    try {
      merger.removeStream(streamRm)
      merger.removeStream(audio)
    } catch (e) {
      console.log(e);
    }
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
    merger.addStream(Audio)
  }

  const handleWatchStream = async () => {
    ws.sendNewReceiver()
    setIsDisplayMainPlayer(true)
  }

  const stopBothVideoAndAudio = (stream) => {
    try {
      stream.getTracks().forEach(track => track.stop())
    } catch (e) {

    }
  }

  const handleStopStream = async () => {
    try {

      try {
        merger._streams.forEach(stream=> merger.removeStream(stream))
        setIsDisplaySmartPlayer(false)
      } catch (e) {
        console.log(e);
      }

      try {
        stopBothVideoAndAudio(screen);
        stopBothVideoAndAudio(audio);
      } catch (e) {
        console.log(e);
      }
      try {
        stopBothVideoAndAudio(cam);
        stopBothVideoAndAudio(audio);
      } catch (e) {
        console.log(e);
      }
      setCam(null)
      setScreen(null)
      setAlreadyStream({cam: false, screen: false})

    } catch (e) {
      console.log('ERRRRR', e);
    }
  }

  const handleStopCamStream = () => {
    setAlreadyStream({...alreadyStream, cam: false})
    if (!alreadyStream.screen) handleStopStream(cam)
    else {
      try {
        merger.addStream(screen)
        merger.addStream(audio)
        merger.removeStream(streamC);
      } catch (e) {
      }
    }
  }

  const handleStopScreenStream = () => {
    setAlreadyStream({...alreadyStream, screen: false})
    if (!alreadyStream.cam) handleStopStream(screen)
    else {
      try {
        merger.addStream(cam)
        merger.removeStream(streamC);
      } catch (e) {
      }
    }
  }

  const handleManageVoice = async () => {
    if (voice) {
      merger.removeStream(audio)
      setVoice(false)
    } else {
      merger.addStream(audio)
      setVoice(true)
    }
  }

  return <div className={s.main}>

    <div className={s.videoBox}>
      {isDisplayMainPlayer ? <video controls ref={videoTagS}/> : null}
    </div>

    <div className={s.videoCStrimBox}>
      {isDisplaySmartPlayer ? <video muted id="videoC" ref={videoTagC}/> : null}
    </div>

    <div className={s.botom}>
      <button
        onClick={alreadyStream.cam ? handleStopCamStream : () => handleStartStream('cam')}>{alreadyStream.cam ? "ВЫКЛ КАМЕРУ" : "СТРИМИТЬ"}</button>
      <button
        onClick={alreadyStream.screen ? handleStopScreenStream : () => handleStartStream('screen')}>{alreadyStream.screen ? "ВЫКЛ ПОКАЗ ЭКРАНА" : "ПОКАЗАТЬ ЭКРАН"}</button>
      <button
        onClick={handleManageVoice}>{voice ? "ВЫКЛ ЗВУК" : "ВКЛ ЗВУК"}</button>
      <button onClick={handleWatchStream}>СМОТРЕТЬ</button>
      <button onClick={handleStopStream}>СТОП</button>
    </div>

  </div>
}
