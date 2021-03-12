/**
 * @typedef { import('../common/type').JoinEvent } JoinEvent
 */

const $ = require('jquery');
const { socket } = require('./socket');

const startCard = $('#start-card');
const startForm = $('#start-form');
const startButton = $('#start-button');
const usernameInput = $('#username-input');

startButton.prop('disabled', !usernameInput.val());
usernameInput.on('input', () => startButton.prop('disabled', !usernameInput.val()));

startForm.on('submit', (event) => {
  console.info('Starting');

  const colors = ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0'];

  let color;
  for (let i = 0; i < 5; i += 1) {
    const input = $(`#color-${i + 1}-input`);
    if (input.prop('checked')) {
      color = colors[i];
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
