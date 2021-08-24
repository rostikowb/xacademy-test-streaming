// export const WS_BASE = 'ws://192.168.8.103:3999'
// export const WS_BASE = 'wss://xacademy.uz'  // заказчика
// export const WS_BASE = 'ws://176.96.243.122:3999'  // заказчика
export const WS_BASE = 'ws://194.177.20.120:3999'  // мой
export const CONFIG_PEER = {
  iceServers: [{
    urls: "turn:176.96.243.122",
    username: "admin",
    credential: "cool123",
  },{
    urls: "stun:176.96.243.122",
    username: "admin",
    credential: "cool123",
  }]
}