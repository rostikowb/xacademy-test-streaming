import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {useSelector} from "react-redux";
import Peer from "simple-peer"
import s from './global.module.css'
import {WebSocketContext} from "../sockets/websocket";
import getusermedia from "getusermedia";
import ReactPlayer from 'react-player'
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
  const [alreadyStream, setAlreadyStream] = useState({cam: false, screen: false})
  const [voice, setVoice] = useState(true)
  const [merger] = useState(new VideoStreamMerger())
  const [mergerS] = useState(new VideoStreamMerger())
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
    if (merger) merger.start();
  }, [merger])

  useEffect(() => {
    if (merger.result) {
      videoTagC.current.srcObject = merger.result
    }
  }, [merger])

  useEffect(() => {
    if (mergerS) mergerS.start();
  }, [mergerS])

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
      await startMainScreen(stream)
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

  // useEffect(()=>{
  //
  //   if (alreadyStream.cam || alreadyStream.screen) return;
  //
  //   const timeId = setTimeout(()=>{
  //     ws.sendNewReceiver()
  //
  //   }, 2000)
  // }, [])
  //
  // useEffect(() => {
  //
  //   if (alreadyStream.cam || alreadyStream.screen) return;
  //   if (!streamS) return;
  //   setTimeout(async () => {
  //     await startMainScreen(streamS)
  //     // ws.sendNewReceiver()
  //
  //   }, 2000)
  // }, [streamS])


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

  const handleStartCamStream = async () => {

    try {
      if (alreadyStream.cam) return;

      if (!alreadyStream.screen) {
        const webcamStream = await getVideo();
        const audioStream = await getAudio();
        if (!webcamStream || !audioStream) return;

        merger.addStream(webcamStream, {
          x: 0,
          y: 0,
          width: merger.width,
          height: merger.height,
        })
        merger.addStream(audioStream)
        // merger.start()

        addStreamToPeer(merger.result)
        setStreamC(merger.result)
        setAlreadyStream({...alreadyStream, cam: true})
        await startSmartScreen(merger.result)
      } else {
        await startCamAndScreen(merger.result, 'screen')
      }
    } catch (e) {
      console.log(e);
    }

  }

  const handleStartScreenCapture = async () => {
    if (alreadyStream.screen) return;

    if (!alreadyStream.cam) {
      const screenStream = await getScreen();
      const audioStream = await getAudio();
      if (!screenStream || !audioStream) return;
      // merger.start()

      merger.addStream(screenStream)
      merger.addStream(audioStream)
      addStreamToPeer(merger.result)
      setStreamC(merger.result)
      setAlreadyStream({...alreadyStream, screen: true})
      await startSmartScreen(merger.result)
    } else {
      await startCamAndScreen(merger.result, 'cam')
    }
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

  const startSmartScreen = async (stream) => {
    try {
      // const videoPlayer = document.getElementById('videoC')
      // videoTagC.current.muted = true;

      // merger.addMediaElement('videoC', videoPlayer)

      videoTagC.current.srcObject = merger.result
      videoTagC.current.addEventListener('error', err => {
        console.log(err);
      })

      // await videoTagC.current.play()
      // await videoPlayer.play()
      // videoPlayer.addEventListener("pause", async () => {
      //   // console.log(merger.result);
      //
      // })

    } catch (e) {
      console.log(e);
    }
  }
  const startMainScreen = async (stream) => {
    // mergerS.addStream(stream)
    // videoTagS.current.volume = 0;
    videoTagS.current.srcObject = stream

    videoTagS.current.addEventListener("play", async () => {
      // console.log(merger.result);
      try {
        const ctx = new AudioContext();
        const videoCyx = ctx.createMediaElementSource(videoTagS.current)
        const streamCtx = ctx.createMediaStreamSource(stream)
        await streamCtx.context.resume();
        await videoCyx.context.resume();
      }catch (e) {
        console.trace(e);
      }
    })

  }

  const handleWatchStream = async () => {
    ws.sendNewReceiver()
  }

  const stopBothVideoAndAudio = (stream) => {
    try {
      stream.getTracks().forEach(track => track.stop())
    } catch (e) {

    }
  }

  const handleStopStream = async (stream) => {
    try {
      // if (peerC || peerS) {
      //   stopBothVideoAndAudio(stream);
      // stopBothVideoAndAudio(streamC);
      // stopBothVideoAndAudio(merger.result);

      try {
        stopBothVideoAndAudio(cam);
        stopBothVideoAndAudio(screen);
        stopBothVideoAndAudio(audio);
      } catch (e) {

      }
      console.log('merger', merger);
      setCam(null)
      setScreen(null)
      console.log('STOOOOOOOOP');
      // peerC.removeStream(streamC);
      // }
      setAlreadyStream({cam: false, screen: false})

      // await videoTagC.current.pause()
      // videoTagS.current.srcObject = null;
      // videoTagC.current.srcObject = null;
      // videoTagC.current.src = '';

      // setStreamS(undefined);

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
      <video muted controls ref={videoTagS}/>
    </div>

    <div className={s.videoCStrimBox}>
      <video controls muted id="videoC" ref={videoTagC}/>
    </div>

    <div className={s.botom}>
      <button
        onClick={alreadyStream.cam ? handleStopCamStream : handleStartCamStream}>{alreadyStream.cam ? "ВЫКЛ КАМЕРУ" : "СТРИМИТЬ"}</button>
      <button
        onClick={alreadyStream.screen ? handleStopScreenStream : handleStartScreenCapture}>{alreadyStream.screen ? "ВЫКЛ ПОКАЗ ЭКРАНА" : "ПОКАЗАТЬ ЭКРАН"}</button>
      <button
        onClick={handleManageVoice}>{voice ? "ВЫКЛ ЗВУК" : "ВКЛ ЗВУК"}</button>
      <button onClick={handleWatchStream}>СМОТРЕТЬ</button>
      <button onClick={handleStopStream}>СТОП</button>
    </div>

  </div>
}
