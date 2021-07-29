import Server from 'socket.io';
import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost",
  },
});

import Peer from "simple-peer";
import wrtc from "wrtc";
// import Blob from "cross-blob"
// import {MediaRecorder} from "extendable-media-recorder";

const port = process.env.PORT || 3000
let Streamer = {}
let Receiver = {}

io.on('connection', function (socket) {
  console.log('connect');
  socket.on('NewClientStreamer', () => {
    let peer = new Peer({
      initiator: false,
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

      // const blob = new Blob(stream, {type: 'application/octet-stream'})
      // console.log(blob);
      // console.log(typeof stream);
      // console.log('streamstreamstream', stream);
      Receiver = {...Receiver, stream}
    })

    peer.on('connect', () => {
      console.log('CONN_STREAM');
    })
    peer.on('data', data => {
      // got a data channel message
      console.log('test msg' + data)
    })

    console.log('NewClientStreamer');
    // socket.emit('CreateClientStreamerPeer')
  })

  function InitializeReceiver(offer) {
    if (Receiver.peer) Receiver.peer.signal(offer)
  }

  socket.on('Offer', (offer) => {
    InitializeReceiver(offer)
  })

  socket.on('NewClientReceiver', () => {
    if (!Receiver.stream) return;
    if (Streamer[socket.id]) Streamer[socket.id].peer.destroy();

    Streamer[socket.id] = {
      gotAnswer: false,
      peer: null
    }

    let peer = new Peer({
      initiator: true,
      wrtc,
      stream: Receiver.stream,
    })

    peer.on('signal', (offer) => {
      // console.log(Streamer[socket.id].gotAnswer);
      if (!Streamer[socket.id].gotAnswer) socket.emit('Offer', offer)
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

    console.log(Object.keys(Streamer));
  })
})

server.listen(port, () => console.log(`Active on ${port} port`))