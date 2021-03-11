const { io } = require('socket.io-client');
const $ = require('jquery');
const { myId } = require('./id');

const socket = io({ query: { id: myId } });
exports.socket = socket;

socket.on('disconnect', () => {
  console.error('Socked disconnected');

  socket.close();

  $('#disconnected-modal').show();
});
