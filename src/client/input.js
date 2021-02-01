/**
 * @typedef { import('../car').Car } Car
 * @typedef { import('../type').InputEvent } InputEvent
 */

const { myId } = require('./id');
const { socket } = require('./socket');

const keys = new Array(256).fill(false);
window.onkeydown = (event) => { keys[event.which] = true; };
window.onkeyup = (event) => { keys[event.which] = false; };

const dpad = {
  left: false,
  right: false,
  up: false,
  down: false,
};

const dpadButton = /** @type { HTMLButtonElement } */ (document.getElementById('dpad-button'));
dpadButton.addEventListener('touchmove', (/** @type {TouchEvent} */ event) => {
  const x = (event.touches[0].clientX - (dpadButton.offsetLeft + dpadButton.clientWidth / 2)) / dpadButton.clientWidth;
  const y = (event.touches[0].clientY - (dpadButton.offsetTop + dpadButton.clientHeight / 2)) / dpadButton.clientHeight;

  if (x < -0.25) {
    dpad.left = true;
    dpad.right = false;
  } else if (x > 0.25) {
    dpad.left = false;
    dpad.right = true;
  } else {
    dpad.left = false;
    dpad.right = false;
  }

  if (y < -0.25) {
    dpad.up = true;
    dpad.down = false;
  } else if (y > 0.25) {
    dpad.up = false;
    dpad.down = true;
  } else {
    dpad.up = false;
    dpad.down = false;
  }
});
dpadButton.addEventListener('touchend', () => {
  dpad.left = false;
  dpad.right = false;
  dpad.up = false;
  dpad.down = false;
});

/**
 * @param {Car} car
 * @param {number} simStep
 */
exports.checkInput = (car, simStep) => {
  if (car) {
    let dirty = false;

    /** @type {InputEvent} */
    const event = {
      id: myId,
      simStep,
    };

    let steerDirection = 0;
    if (keys[65] || dpad.left) {
      steerDirection = 1;
    } else if (keys[68] || dpad.right) {
      steerDirection = -1;
    }

    if (steerDirection !== car.steerDirection) {
      event.steerDirection = steerDirection;
      dirty = true;
    }

    if ((keys[87] || dpad.up) !== car.accelerate) {
      event.accelerate = keys[87] || dpad.up;
      dirty = true;
    }

    if ((keys[83] || dpad.down) !== car.brake) {
      event.brake = keys[83] || dpad.down;
      dirty = true;
    }

    if (keys[32] !== car.shoot) {
      event.shoot = keys[32];
      dirty = true;
    }

    if (dirty) {
      car.processInput(event, simStep);
      socket.emit('input', event);
    }
  }
};
