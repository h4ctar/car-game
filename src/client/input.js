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

const joystick = /** @type {HTMLDivElement} */ (document.getElementById('joystick'));
const stick = /** @type {HTMLDivElement} */ (document.getElementById('stick'));
const shootButton = /** @type {HTMLDivElement} */ (document.getElementById('shoot-button'));

if (isTouchCapable) {
  stick.addEventListener('touchmove', (/** @type {TouchEvent} */ event) => {
    const stickCenterX = joystick.offsetLeft + stick.offsetLeft + stick.clientWidth / 2;
    const stickCenterY = joystick.offsetTop + stick.offsetTop + stick.clientHeight / 2;
    const stickDeltaX = clamp(event.touches[0].clientX - stickCenterX, -64, 64);
    const stickDeltaY = clamp(event.touches[0].clientY - stickCenterY, -64, 64);
    touchpad.xAxis = stickDeltaX / 64;
    touchpad.yAxis = stickDeltaY / 64;
    stick.style.transform = `translate(${stickDeltaX}px, ${stickDeltaY}px)`;
  });
  stick.addEventListener('touchend', () => {
    touchpad.xAxis = 0;
    touchpad.yAxis = 0;
    stick.style.transform = 'translate(0px, 0px)';
  });

  shootButton.addEventListener('touchstart', () => { touchpad.shoot = true; });
  shootButton.addEventListener('touchend', () => { touchpad.shoot = false; });
} else {
  joystick.style.display = 'none';
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
      event.steer = -Math.round(touchpad.xAxis * STEER_RESOLUTION);
    } else if (keys[65]) {
      event.steer = STEER_RESOLUTION;
    } else if (keys[68]) {
      event.steer = -STEER_RESOLUTION;
    } else {
      event.steer = 0;
    }

    event.accelerate = keys[87] || touchpad.yAxis < -0.5;
    event.brake = keys[83] || (touchpad.yAxis > 0.5);
    event.shoot = keys[32] || touchpad.shoot;

    const currentInput = car.lastInput();
    const dirty = event.steer !== currentInput.steer || event.accelerate !== currentInput.accelerate || event.brake !== currentInput.brake || event.shoot !== currentInput.shoot;

    if (dirty) {
      car.processInput(event, simStep);
      socket.emit('input', event);
    }
  }
};
