const { Toast } = require('bootstrap');
const { io } = require('socket.io-client');
const { myId } = require('./id');

const socket = io({ query: `id=${myId}` });
exports.socket = socket;

socket.on('disconnect', () => {
  console.error('Socked disconnected');

  socket.close();

  const disconnectedToast = new Toast(document.getElementById('disconnected-toast'));
  disconnectedToast.show();
});

let pingTime;
setInterval(() => {
  pingTime = Date.now();
  socket.emit('ping');
}, 10000);
socket.on('pong', () => console.info(`latency: ${Date.now() - pingTime}`));
