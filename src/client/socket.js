const { io } = require('socket.io-client');
const { myId } = require('./id');

const socket = io({ query: { id: myId } });
exports.socket = socket;

socket.on('disconnect', () => {
  console.error('Socked disconnected');

  socket.close();

  const disconnectedModal = document.getElementById('disconnected-modal');
  disconnectedModal.style.display = 'block';
});
