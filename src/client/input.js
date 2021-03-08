/**
 * @typedef { import('../common/car').Car } Car
 * @typedef { import('../common/type').InputEvent } InputEvent
 */

const { STEER_RESOLUTION } = require('../common/config');
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
 * @param {Car} car the car to process the input
 * @param {number} simStep the current simulation step
 * @returns {void}
 */
exports.checkInput = (car, simStep) => {
  if (car) {
    /** @type {InputEvent} */
    const event = {
      id: myId,
      simStep,
    };

    if (isTouchCapable) {
      event.steer = Math.round(touchpad.xAxis * STEER_RESOLUTION);
    } else if (keys[65]) {
      event.steer = STEER_RESOLUTION;
    } else if (keys[68]) {
      event.steer = -STEER_RESOLUTION;
    } else {
      event.steer = 0;
    }

    event.accelerate = keys[87] || touchpad.yAxis > 0.5;
    event.brake = keys[83] || (touchpad.yAxis < -0.5);
    event.shoot = keys[32] || touchpad.shoot;

    const currentInput = car.lastInput();
    const dirty = event.steer !== currentInput.steer || event.accelerate !== currentInput.accelerate || event.brake !== currentInput.brake || event.shoot !== currentInput.shoot;

    if (dirty) {
      car.processInput(event, simStep);
      socket.emit('input', event);
    }
  }
};
