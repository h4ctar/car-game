const { Modal } = require('bootstrap');
const { io } = require('socket.io-client');
const { myId } = require('./id');

const socket = io({ query: `id=${myId}` });
exports.socket = socket;

socket.on('connect', () => {
  // todo: type here
  socket.emit('start', { requestTime: Date.now() });
});

socket.on('disconnect', () => {
  console.error('Socked disconnected');

  socket.close();

  const disconnectedModal = new Modal(document.getElementById('disconnected-modal'), { backdrop: 'static', keyboard: false });
  disconnectedModal.show();

  // todo: stop sim on disconnect
});

let pingTime;
setInterval(() => {
  pingTime = Date.now();
  socket.emit('ping');
}, 10000);
socket.on('pong', () => console.info(`latency: ${Date.now() - pingTime}`));
