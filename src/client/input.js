/**
 * @typedef { import('../car').Car } Car
 * @typedef { import('../type').InputEvent } InputEvent
 */

const { myId } = require('./id');
const { socket } = require('./socket');

const keys = new Array(256).fill(false);
window.onkeydown = (event) => { keys[event.which] = true; };
window.onkeyup = (event) => { keys[event.which] = false; };

const touchpad = {
  left: false,
  right: false,
  up: false,
  down: false,
  shoot: false,
};

const isTouchCapable = 'ontouchstart' in window;

const dpadButton = /** @type { HTMLDivElement } */ (document.getElementById('dpad-button'));
const shootButton = /** @type { HTMLDivElement } */ (document.getElementById('shoot-button'));

if (isTouchCapable) {
  dpadButton.addEventListener('touchmove', (/** @type {TouchEvent} */ event) => {
    const x = (event.touches[0].clientX - (dpadButton.offsetLeft + dpadButton.clientWidth / 2)) / dpadButton.clientWidth;
    const y = (event.touches[0].clientY - (dpadButton.offsetTop + dpadButton.clientHeight / 2)) / dpadButton.clientHeight;

    if (x < -0.25) {
      touchpad.left = true;
      touchpad.right = false;
    } else if (x > 0.25) {
      touchpad.left = false;
      touchpad.right = true;
    } else {
      touchpad.left = false;
      touchpad.right = false;
    }

    if (y < -0.25) {
      touchpad.up = true;
      touchpad.down = false;
    } else if (y > 0.25) {
      touchpad.up = false;
      touchpad.down = true;
    } else {
      touchpad.up = false;
      touchpad.down = false;
    }
  });
  dpadButton.addEventListener('touchend', () => {
    touchpad.left = false;
    touchpad.right = false;
    touchpad.up = false;
    touchpad.down = false;
  });

  shootButton.addEventListener('touchstart', () => { touchpad.shoot = true; });
  shootButton.addEventListener('touchend', () => { touchpad.shoot = false; });
} else {
  dpadButton.style.display = 'none';
  shootButton.style.display = 'none';
}

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
    if (keys[65] || touchpad.left) {
      steerDirection = 1;
    } else if (keys[68] || touchpad.right) {
      steerDirection = -1;
    }

    if (steerDirection !== car.steerDirection) {
      event.steerDirection = steerDirection;
      dirty = true;
    }

    if ((keys[87] || touchpad.up) !== car.accelerate) {
      event.accelerate = keys[87] || touchpad.up;
      dirty = true;
    }

    if ((keys[83] || touchpad.down) !== car.brake) {
      event.brake = keys[83] || touchpad.down;
      dirty = true;
    }

    if ((keys[32] || touchpad.shoot) !== car.shoot) {
      event.shoot = keys[32] || touchpad.shoot;
      dirty = true;
    }

    if (dirty) {
      car.processInput(event, simStep);
      socket.emit('input', event);
    }
  }
};
