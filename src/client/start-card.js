/**
 * @typedef { import('../type').JoinEvent } JoinEvent
 */

const { socket } = require('./socket');

const startCard = document.getElementById('start-card');
const startForm = document.getElementById('start-form');
const startButton = /** @type { HTMLInputElement} */ (Array.from(document.getElementsByTagName('button')).find((element) => element.textContent === 'Start'));
const usernameInput = /** @type { HTMLInputElement} */ (document.getElementById('username-input'));

startButton.disabled = !usernameInput.value;
usernameInput.addEventListener('input', () => { startButton.disabled = !usernameInput.value; });

startForm.addEventListener('submit', (event) => {
  console.info('Starting');

  const colors = ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0'];

  let color;
  for (let i = 0; i < 5; i += 1) {
    const input = /** @type { HTMLInputElement} */ (document.getElementById(`color-${i + 1}-input`));
    if (input.checked) {
      color = colors[i];
    }
  }

  /** @type {JoinEvent} */
  const joinEvent = {
    username: usernameInput.value,
    color,
  };
  socket.emit('join', joinEvent);
  event.preventDefault();
});

exports.showStartCard = () => { startCard.style.display = 'block'; };
exports.hideStartCard = () => { startCard.style.display = 'none'; };
