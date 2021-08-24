import Server from 'socket.io';
import express from 'express';
import {createServer} from 'http';
import Peer from "simple-peer";
import wrtc from "wrtc";
import cors from "cors";
import beforeOffer from "./saveStream.mjs";


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
app.use(express.static("public"));

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

io.on('connection', (socket) => {
  console.log('connect');
  socket.on('NewClientStreamer', () => {
    let peer = new Peer({
      initiator: false,
      config: CONFIG_PEER,
      wrtc,
    })

    Receiver = {peer}
    peer.on('signal', (data) => {
      socket.emit('Answer', data)
    })
    peer.on('close', () => {
      console.log('sssss');
      Receiver = {}
    })
    peer.on('stream', (stream) => {
      console.log('sTREAM');



      beforeOffer(stream)



      Receiver = {...Receiver, stream}
    })
    peer.on('track', (track, stream) => {
      console.log('track1', track);
      console.log('stream1', stream);
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
  })

  socket.on('Offer', (offer) => {
    if (Receiver.peer) Receiver.peer.signal(offer)
  })

  socket.on('NewClientReceiver', () => {
    console.log('Receiver.stream', Receiver.stream);
    if (!Receiver.stream) return;
    if (Streamer[socket.id]) {
      try {
        Streamer[socket.id].peer.destroy();
      } catch (e) {
        console.log(e);
      }
    }

    Streamer[socket.id] = {
      gotAnswer: false,
      peer: null
    }
    let peer = new Peer({
      initiator: true,
      config: CONFIG_PEER,
      wrtc,
      stream: Receiver.stream,
    })

    peer.on('signal', (offer) => {
      if (!Streamer[socket.id]?.gotAnswer) socket.emit('Offer', offer)
    })
    peer.on('connect', () => {
      console.log('CONN_REC');

    })
    peer.on('track', (track, stream) => {
      console.log('track2', track);
      console.log('stream2', stream);
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

    console.log(Object.keys(Streamer));

  })
})


server.listen(port, () => console.log(`Active on ${port} port`))