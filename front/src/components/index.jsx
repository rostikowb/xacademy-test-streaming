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
  let peerS = useMemo(() => new Peer({initiator: false, config: CONFIG_PEER}), [])
  const [cam, setCam] = useState()
  const [screen, setScreen] = useState()
  const [streamC, setStreamC] = useState()
  const [alreadyStream, setAlreadyStream] = useState({cam: false, screen: false})
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

    console.log('DFSDF');
    peerS.on('stream', async (stream) => {
      console.log('stream from server');
      console.log(stream);
      console.log('mergerS.result', mergerS.result);
      await startMainScreen(stream)
      // setStreamS(stream)
        // mergerS.addStream(stream)
        // console.log('mergerS.result2', mergerS.result);
        // startMainScreen(mergerS.result)

      // videoTagS.current.srcObject = stream
      // videoTagS.current.play()

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
    peerS.on('track', async (track, stream) => {

      // let i = 5
      // while (i--){
      //   try {

      //     console.log('YES');
      //     break;
      //   }catch (e) {
      //     console.log(e);
      //   }
      // }

      // console.log(track);
      // console.log(stream);
    })
  }, [ws, peerS])


  const getWebCam = async () => {
    // const data = await new Promise(resolve => getusermedia({video: true, audio: true}, (err, webcamStream) => {
    //   resolve(webcamStream)
    // }))
    // console.log('data', data);
    const data = await navigator.mediaDevices.getUserMedia({video: true, audio: true})
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
        //   console.log('catch1', e);
        //   try {
        //     peerC.removeStream(stream)
        //     peerC.addStream(stream)
        //   }catch (e) {
        //     console.log('catch2', e);
        //   }
        //   console.log(e);
      }
    }
  }

  const handleStartCamStream = async () => {

    try {
      if (alreadyStream.cam) return;

      if (!alreadyStream.screen) {
        const webcamStream = await getWebCam();
        if (!webcamStream) return;

        merger.addStream(webcamStream)
        // merger.start()

        addStreamToPeer(merger.result)
        setStreamC(merger.result)
        setAlreadyStream({...alreadyStream, cam: true})
        await startSmartScreen(merger.result)
      } else {
        await startCamAndScreen(merger.result, 'screen')
      }
    }catch (e) {
      console.log(e);
    }

  }

  const handleStartScreenCapture = async () => {
    if (alreadyStream.screen) return;

    if (!alreadyStream.cam) {
      const screenStream = await getScreen();
      if (!screenStream) return;
      // merger.start()

      merger.addStream(screenStream)
      addStreamToPeer(merger.result)
      setStreamC(merger.result)
      setAlreadyStream({...alreadyStream, screen: true})
      await startSmartScreen(merger.result)
    } else {
      await startCamAndScreen(merger.result, 'cam')
    }
  }

  const startCamAndScreen = async (streamRm) => {
    let Cam, Screen
    if (cam) Cam = cam;
    else {
      Cam = await getWebCam();
      console.log('AAAAAAAAA');
    }
    if (screen) Screen = screen;
    else {
      Screen = await getScreen()
    }

    // stopBothVideoAndAudio(cam)
    // stopBothVideoAndAudio(screen)

    if (!Cam || !Screen) return;

    setAlreadyStream({cam: true, screen: true})
    try {
      merger.removeStream(streamRm)
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
    console.log('CAM MERGE', Cam);
    merger.addStream(Cam, {
      x: merger.width - 150,
      y: merger.height - 150,
      width: 150,
      height: 150,
      mute: false
    })

    try {
      // merger.removeStream(streamRm)
    } catch (e) {
      console.log(e);
    }

    console.log('peerC', peerC);

    try {
      // merger.start()
      const stream = merger.result;
      // peerC.removeStream(streamRm)
      // peerC.addStream(stream)
      // replaceStreamToServ(stream)
      // setStreamC(stream)
      console.log('peerC2', peerC);
    } catch (e) {
      console.log(e);
    }
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
      // console.log('cam', cam);
      // console.log('merger.result', merger.result);
      videoTagC.current.srcObject = merger.result
      await videoTagC.current.play()
    } catch (e) {

    }
  }
  const startMainScreen = async (stream) =>{
    try{
      const videoPlayer = document.getElementById('videoS')
      merger.addMediaElement('videoS', videoPlayer)
      videoTagS.current.srcObject = stream

      await videoPlayer.play()
      await videoTagC.current.play()
    }catch (e) {
    }
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
        stopBothVideoAndAudio(cam);
        stopBothVideoAndAudio(screen);
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

  return <div className={s.main}>

    <div className={s.videoBox}>
      <video id='videoS' ref={videoTagS}/>
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
