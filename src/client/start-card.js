/**
 * @typedef { import('../common/type').JoinEvent } JoinEvent
 */

const $ = require('jquery');
const { COLORS } = require('../common/config');
const { socket } = require('./socket');

const startCard = $('#start-card');
const startForm = $('#start-form');
const startButton = $('#start-button');
const usernameInput = $('#username-input');

startButton.prop('disabled', !usernameInput.val());
usernameInput.on('input', () => startButton.prop('disabled', !usernameInput.val()));

startForm.on('submit', (event) => {
  console.info('Starting');

  let color;
  for (let i = 0; i < 5; i += 1) {
    const input = $(`#color-${i + 1}-input`);
    if (input.prop('checked')) {
      color = COLORS[i];
    }
  }

  /** @type {JoinEvent} */
  const joinEvent = {
    username: String(usernameInput.val()),
    color,
  };
  socket.emit('join', joinEvent);

  event.preventDefault();

  startCard.hide();
});

exports.showStartCard = () => { startCard.show(); usernameInput.trigger('focus'); };
