import Server from 'socket.io';
import express from 'express';
import {createServer} from 'http';
import Peer from "simple-peer";
import wrtc from "wrtc";
import cors from "cors";
import {beforeOffer, glueRecord} from "./saveStream.mjs";


const app = express();
const server = createServer(app);
const io = new Server(server, {
  // cors: {
  //   origin: "http://localhost",
  // },
});
let url = import.meta.url.split('/')
url.pop()
url = url.join('/')

app.use(cors());
app.use(express.static("video"));
// app.use(express.static("public"));

const CONFIG_PEER = {
  iceServers: [{
    urls: "turn:176.96.243.122",
    username: "admin",
    credential: "cool123",
  }, {
    urls: "stun:176.96.243.122",
    username: "admin",
    credential: "cool123",
  }]
}


const port = process.env.PORT || 3999
let Streamer = {}
let Receiver = {}

app.get('/getRooms', (req, res) => {
  const list = Object.keys(Receiver)
  return res.status(200).json({list})
})

app.get('/glueRecord/:id', async (req, res) => {
  const id = req?.params?.id;
  if (!id) return res.status(403).json('id not found')
  res.status(200).json('ok')
  glueRecord(id)
})

io.on('connection', (socket) => {
  console.log('connect');
  socket.on('NewClientStreamer', (data) => {
    let peer = new Peer({
      initiator: false,
      config: CONFIG_PEER,
      wrtc,
    })
    Receiver[data] = {peer, stream: null}
    // Receiver = {peer, stream: null}

    peer.on('signal', (data) => {
      socket.emit('Answer', data)
    })
    peer.on('close', () => {
      console.log('sssss');
      // Receiver = {}
      delete Receiver[data]
    })
    peer.on('stream', (stream) => {
      console.log('sTREAM');


      try {
        beforeOffer(stream, data, peer)
      } catch (e) {
        console.log(e);
      }

      Receiver[data].stream = stream;
      // Receiver.stream = stream;
    })

    peer.on('connect', () => {
      console.log('CONN_STREAM');
    })
    peer.on('data', data => {
      // got a data channel message
      console.log('test msg' + data)
    })
    peer.on('error', console.trace)

    console.log('NewClientStreamer');
    // socket.emit('CreateClientStreamerPeer')
    socket.on('Offer', (offer) => {

      if (Receiver[data].peer) Receiver[data].peer.signal(offer)
      // if (Receiver.peer) Receiver.peer.signal(offer)
    })
  })


  socket.on('NewClientReceiver', (data) => {
    console.log('Receiver.stream', data);
    console.log(Object.keys(Streamer));

    if (Receiver[data]?.stream) startP2P(socket, data);
    else waitAStream(socket, data);

  })
})

const startP2P = (socket, data) => {

  // let peer;
  // if (!Streamer[socket.id]?.peer) {
  //   Streamer[socket.id] = {
  //     gotAnswer: false,
  //     peer: null
  //   }
  //
  //   const peerOption = {
  //     initiator: true,
  //     config: CONFIG_PEER,
  //     wrtc,
  //     // stream: Receiver[data].stream,
  //     // stream: Receiver.stream,
  //   }
  //
  //   if (Receiver[data]?.stream) peerOption.stream = Receiver[data].stream
  //
  //   peer = new Peer(peerOption)
  // } else peer = Streamer[socket.id].peer;

  if (Streamer[socket.id]?.peer) {
    return;
    // try {
    //   console.log('destroyyyyyyyy');
    //   Streamer[socket.id].peer.destroy();
    // } catch (e) {
    //   console.log(e);
    // }
  }

  Streamer[socket.id] = {
    gotAnswer: false,
    peer: null
  }
  let peer = new Peer({
    initiator: true,
    config: CONFIG_PEER,
    wrtc,
    stream: Receiver[data].stream,
  })



  peer.on('signal', (offer) => {
    if (!Streamer[socket.id]?.gotAnswer) socket.emit('Offer', offer)
  })
  peer.on('connect', () => {
    console.log('CONN_REC');

  })

  peer.on('close', () => {
    console.log('close peer');
    delete Streamer[socket.id];
  })

  peer.on('error', (err) => {
    console.trace(err);
    delete Streamer[socket.id];
  })

  Streamer[socket.id].peer = peer

  socket.on('ClientAnswer', (data) => {
    if (Streamer[socket.id]) {
      Streamer[socket.id].gotAnswer = true
      Streamer[socket.id].peer.signal(data)
    }
  })
}

const waitAStream = (socket, data) => {
  const timerId = setInterval(() => {
    if (Receiver[data]?.stream) {
      try {
        startP2P(socket, data)
        clearInterval(timerId)
      } catch (e) {
        console.log('Error addStream ===> ', e);
      }
    }
  }, 5000)

  socket.on('disconnect', () => clearInterval(timerId))
  if (Streamer[socket.id]?.peer) Streamer[socket.id].peer.on('close', () => clearInterval(timerId))
}


server.listen(port, () => console.log(`Active on ${port} port`))