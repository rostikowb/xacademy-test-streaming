import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import Peer from "simple-peer"
import s from './global.module.css'
import {WebSocketContext} from "../sockets/websocket";
import {VideoStreamMerger} from "video-stream-merger";
import {CONFIG_PEER} from "../config";

export const Index = () => {

  // useState - https://reactjs.org/docs/hooks-state.html по сути состояние
  // в первый элемент масива записывается само состояние а во втоорой метод его изменения
  // peer - это обект соединения p2p
  // peerС - со стороны клиента | peerS - сервера, useMemo это просто что бы создать обект только 1 раз
  const [peerC, setPeerC] = useState()
  let peerS = useMemo(() => new Peer({initiator: false, config: CONFIG_PEER}), [])
  // далее объекты стримов с устройства cam,audio,screen
  const [cam, setCam] = useState()
  const [audio, setAudio] = useState()
  const [screen, setScreen] = useState()
  // объекты смердженых стримов 1 с клиента - исходящий, второй приходящий
  // я незнаю может страницы стримера и зрителя нужно было разделить, это на ваше усмотрение
  const [streamC, setStreamC] = useState()
  const [streamS, setStreamS] = useState()
  // это обекты для рукопожатия в p2p соединении
  const [peerAnswer, setPeerAnswer] = useState()
  const [peerOffer, setPeerOffer] = useState()
  // тут по названию думаю понятно
  const [isDisplayMainPlayer, setIsDisplayMainPlayer] = useState(false)
  const [isDisplaySmartPlayer, setIsDisplaySmartPlayer] = useState(false)
  const [alreadyStream, setAlreadyStream] = useState({cam: false, screen: false})
  const [voice, setVoice] = useState(true)
  // объект мерджера который обеденяет стримы
  const [merger, setMerger] = useState()
  // буль обозначающий была ли попытка рукопожатия
  const [gotAnswer, setGotAnswer] = useState(false)
  // по сути просто ссылки на два плеера как бы document.getElementBy...
  const videoTagS = useRef()
  const videoTagC = useRef()
  const [chanel, setChanel] = useState('')

  // получаем из провайдера открытый сокет и его методы
  const ws = useContext(WebSocketContext);

  // метод открытия p2p для начала стрима
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
      console.log('connect');
      peer.send('test connect - OK')
    })

  }

  // листенеры ответов от сокета, обявляються если ws?.socket не false
  useEffect(()=>{
    if(!ws?.socket) return;

    ws.socket.on("Answer", (msg) => setPeerAnswer(msg))
    ws.socket.on("Offer", (msg) => setPeerOffer(msg))
  }, [ws?.socket])

  // при появлении единого стрима, или передает его плееру или активирует плеер если его нет
  useEffect(() => {
    if (merger?.result) {
      if (videoTagC?.current) videoTagC.current.srcObject = merger.result;
      else setIsDisplaySmartPlayer(true);
    }
  }, [merger?.result])

  // передает единый стрим плееру как только тот появиться
  useEffect(() => {
    if (isDisplaySmartPlayer) {
      videoTagC.current.srcObject = merger.result
      videoTagC.current.play()
    }

  }, [isDisplaySmartPlayer])

  // если есть главный плеер и стрим с сервера то передает ему
  useEffect(() => {
    if (isDisplayMainPlayer && streamS) {
      videoTagS.current.srcObject = streamS
      // videoTagS.current.srcObject = cam
      videoTagS.current.play()
    }

  }, [isDisplayMainPlayer, streamS])

  // часть рукопожатия - при появлении peerAnswer передает его peerC
  useEffect(() => {
    if (peerAnswer) {

      try {
        peerC.signal(peerAnswer)
        setGotAnswer(true)
      } catch (e) {
        console.log(e);
      }
    }
  }, [peerAnswer, peerC])

  // часть рукопожатия - при появлении peerOffer передает его peerS
  useEffect(() => {

    if (peerOffer) {
      try {
        peerS.signal(peerOffer)
      } catch (e) {
      }
    }
  }, [peerOffer, peerS])

  // если ws, peerS инициализируються то подписываються события
  useEffect(() => {
    if (!ws) return;

    // принимаеться стрим
    peerS.on('stream', async (stream) => {
      console.log('stream from server');
      setStreamS(stream)
      // videoTagS.current.srcObject = stream
    })
    // часть рукопожатия
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

  // если появляеться тру streamC то запускаем videoTagC плеер
  useEffect(() => {
    if (streamC) {
      (async () => {
        console.log(await videoTagC.current.play());
      })()
    }
  }, [streamC])

// методы получения стримов из устройств по запросу
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

    const data = await navigator.mediaDevices.getUserMedia({
      video: {width: {exact: 1280}, height: {exact: 720}}
    })
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

  // запуск соединения и добавлением стрима
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

  // метод старта стрима/получения данных с устройств/переключения и мерджа
  const handleStartStream = async (type) => {
    if (alreadyStream[type]) return;
    let merg;
    if (!merger) {
      merg = new VideoStreamMerger({
        width: 1280,   // Width of the output video
        height: 720,  // Height of the output video
        // fps: 30,       // Video capture frames per second
        // clearRect: true, // Clear the canvas every frame
        // audioContext: null, // Supply an external AudioContext (for audio effects)
      })
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
        width: 1280,
        height: 720,
      })
    }
    addStreamToPeer(merg.result)
    setStreamC(merg.result)
    setAlreadyStream({...alreadyStream, [type]: true})
    console.log('merg', merg);
  }

  // метод соединения скрина и камеры
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
      width: 1280,
      height: 720,
      // width: merger.width,
      // height: merger.height,

      mute: true
    })

    merger.addStream(Cam, {
      x: merger.width - 256,
      y: merger.height - 144,
      width: 256,
      height: 144,
      mute: false
    })
    merger.addStream(Audio)
  }

  // метод старта просмотра стрима(запрос по сокетам на добавления зрителя и установку соединения)
  const handleWatchStream = async () => {
    ws.sendNewReceiver(chanel)
    setIsDisplayMainPlayer(true)
  }

  const stopBothVideoAndAudio = (stream) => {
    try {
      stream.getTracks().forEach(track => track.stop())
    } catch (e) {

    }
  }

  // остановка стрима которая не то что бы прямо останавливает, но данные с устройств не передает
  const handleStopStream = async () => {
    try {

      try {
        merger._streams.forEach(stream => merger.removeStream(stream))
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
    console.log(merger.result);
    if (voice) {
      merger.removeStream(audio)
      setVoice(false)
    } else {
      merger.addStream(audio)
      setVoice(true)
    }
  }

  // отображение
  return <div className={s.main}>

    <div className={s.videoBox}>
      {isDisplayMainPlayer ? <video controls ref={videoTagS}/> : null}
    </div>

    <div className={s.videoCStrimBox}>
      {isDisplaySmartPlayer ? <video muted id="videoC" ref={videoTagC}/> : null}
    </div>

    <div className={s.botom}>
      <div className={s.chanelBox}>
        <input type="text" value={chanel} onChange={({target})=>setChanel(target.value)}/>
        <button onClick={handleWatchStream}>СМОТРЕТЬ</button>
      </div>
      <button
        onClick={alreadyStream.cam ? handleStopCamStream : () => handleStartStream('cam')}>{alreadyStream.cam ? "ВЫКЛ КАМЕРУ" : "СТРИМИТЬ"}</button>
      <button
        onClick={alreadyStream.screen ? handleStopScreenStream : () => handleStartStream('screen')}>{alreadyStream.screen ? "ВЫКЛ ПОКАЗ ЭКРАНА" : "ПОКАЗАТЬ ЭКРАН"}</button>
      <button
        onClick={handleManageVoice}>{voice ? "ВЫКЛ ЗВУК" : "ВКЛ ЗВУК"}</button>

      <button onClick={handleStopStream}>СТОП</button>
    </div>

  </div>
}
