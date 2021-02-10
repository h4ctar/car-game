/**
 * @typedef { import('../common/car').Car } Car
 * @typedef { import('../common/type').InputEvent } InputEvent
 */

const { STEER_RESOLUTION } = require('../common/config');
const { serializeInputEvent } = require('../common/type');
const { clamp } = require('../common/util');
const { myId } = require('./id');
const { socket } = require('./socket');

const keys = new Array(256).fill(false);

/** @type {{xAxis: number, yAxis: number, shoot: boolean}} */
const touchpad = {
  xAxis: 0,
  yAxis: 0,
  shoot: false,
};

const isTouchCapable = 'ontouchstart' in window;

const dpadButton = /** @type {HTMLDivElement} */ (document.getElementById('dpad-button'));
const shootButton = /** @type {HTMLDivElement} */ (document.getElementById('shoot-button'));

if (isTouchCapable) {
  dpadButton.addEventListener('touchmove', (/** @type {TouchEvent} */ event) => {
    touchpad.xAxis = clamp(-(event.touches[0].clientX - (dpadButton.offsetLeft + dpadButton.clientWidth / 2)) / (dpadButton.clientWidth / 2), -1, 1);
    touchpad.yAxis = clamp(-(event.touches[0].clientY - (dpadButton.offsetTop + dpadButton.clientHeight / 2)) / (dpadButton.clientHeight / 2), -1, 1);
  });
  dpadButton.addEventListener('touchend', () => {
    touchpad.xAxis = 0;
    touchpad.yAxis = 0;
  });

  shootButton.addEventListener('touchstart', () => { touchpad.shoot = true; });
  shootButton.addEventListener('touchend', () => { touchpad.shoot = false; });
} else {
  dpadButton.style.display = 'none';
  shootButton.style.display = 'none';

  window.onkeydown = (event) => { keys[event.which] = true; };
  window.onkeyup = (event) => { keys[event.which] = false; };
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

    let steerDirection;

    if (isTouchCapable) {
      steerDirection = Math.round(touchpad.xAxis * STEER_RESOLUTION);
    } else if (keys[65]) {
      steerDirection = STEER_RESOLUTION;
    } else if (keys[68]) {
      steerDirection = -STEER_RESOLUTION;
    } else {
      steerDirection = 0;
    }

    if (steerDirection !== car.steerDirection) {
      event.steerDirection = steerDirection;
      dirty = true;
    }

    if ((keys[87] || (touchpad.yAxis > 0.5)) !== car.accelerate) {
      event.accelerate = keys[87] || touchpad.yAxis > 0.5;
      dirty = true;
    }

    if ((keys[83] || touchpad.yAxis < -0.5) !== car.brake) {
      event.brake = keys[83] || (touchpad.yAxis < -0.5);
      dirty = true;
    }

    if ((keys[32] || touchpad.shoot) !== car.shoot) {
      event.shoot = keys[32] || touchpad.shoot;
      dirty = true;
    }

    if (dirty) {
      car.processInput(event, simStep);
      socket.emit('input', serializeInputEvent(event));
    }
  }
};
