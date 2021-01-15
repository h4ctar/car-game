/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/car/index.js":
/*!**************************!*\
  !*** ./src/car/index.js ***!
  \**************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("const { add, atan, dot, multiply, rotate } = __webpack_require__(/*! mathjs */ \"mathjs\");\n\nconst tween = (currentValue, targetValue, step) => {\n  let newValue = currentValue;\n  if (currentValue > targetValue) {\n    newValue = currentValue - step;\n    if (newValue < targetValue) {\n      newValue = targetValue;\n    }\n  } else if (currentValue < targetValue) {\n    newValue = currentValue + step;\n    if (newValue > targetValue) {\n      newValue = targetValue;\n    }\n  }\n  return newValue;\n};\n\nconst WHEEL_FL = 0;\nconst WHEEL_FR = 1;\nconst WHEEL_RL = 2;\nconst WHEEL_RR = 3;\n\nconst dt = 0.016;\n\nexports.Car = class {\n  constructor(id) {\n    this.id = id;\n\n    this.history = [];\n\n    this.position = [0, 0];\n    this.angle = 0;\n    this.velocity = [0, 0];\n    this.angularVelocity = 0;\n    this.steerDirection = 0;\n    this.accelerate = false;\n    this.brake = false;\n    this.wheelbase = 50;\n    this.track = 25;\n    this.mass = 2;\n    this.momentOfInertia = this.mass * (this.wheelbase * this.wheelbase + this.track * this.track) / 12;\n\n    this.wheelWidth = 8;\n    this.wheelDiameter = 16;\n\n    this.wheels = new Array(4);\n    this.wheels[WHEEL_FL] = {\n      position: [this.wheelbase / 2, -this.track / 2],\n      angle: 0,\n    };\n    this.wheels[WHEEL_FR] = {\n      position: [this.wheelbase / 2, this.track / 2],\n      angle: 0,\n    };\n    this.wheels[WHEEL_RL] = {\n      position: [-this.wheelbase / 2, -this.track / 2],\n      angle: 0,\n    };\n    this.wheels[WHEEL_RR] = {\n      position: [-this.wheelbase / 2, this.track / 2],\n      angle: 0,\n    };\n  }\n\n  input(event, currentSimStep) {\n    // go back in history to find when the input should be applied\n    // apply the input\n    // step forward until now\n    this.steerDirection = event.steerDirection === undefined ? this.steerDirection : event.steerDirection;\n    this.accelerate = event.accelerate === undefined ? this.accelerate : event.accelerate;\n    this.brake = event.brake === undefined ? this.brake : event.brake;\n  }\n\n  update() {\n    this.history.push({\n      position: this.position,\n      angle: this.angle,\n      velocity: this.velocity,\n      angularVelocity: this.angularVelocity,\n      steerDirection: this.steerDirection,\n      accelerate: this.accelerate,\n      brake: this.brake,\n      wheels: this.wheels.map((wheel) => ({ ...wheel }))\n    });\n\n    // make sure it never gets too long\n    if (this.history.length > 100) {\n      this.history.shift();\n    }\n\n    // steer the wheels\n    // ackerman https://datagenetics.com/blog/december12016/index.html\n    let targetLeftAngle = 0;\n    let targetRightAngle = 0;\n    if (this.steerDirection !== 0) {\n      const turnRadius = 80;\n      targetLeftAngle = this.steerDirection * atan(this.wheelbase / (turnRadius + this.steerDirection * this.track / 2));\n      targetRightAngle = this.steerDirection * atan(this.wheelbase / (turnRadius - this.steerDirection * this.track / 2));\n    }\n\n    this.wheels[WHEEL_FL].angle = tween(this.wheels[WHEEL_FL].angle, targetLeftAngle, 4 * dt);\n    this.wheels[WHEEL_FR].angle = tween(this.wheels[WHEEL_FR].angle, targetRightAngle, 4 * dt);\n\n    // todo: power curve\n    // todo: reverse\n    const wheelForce = this.accelerate ? 300 : 0;\n\n    // calculate the acceleration\n    let acceleration = [0, 0];\n    let angularAcceleration = 0;\n    this.wheels.forEach((wheel) => {\n      const wheelPosition = rotate(wheel.position, this.angle);\n      const wheelVelocity = add(this.velocity, multiply([-wheelPosition[1], wheelPosition[0]], this.angularVelocity));\n\n      // power\n      let force = rotate([wheelForce, 0], this.angle + wheel.angle);\n\n      // brake\n      if (this.brake) {\n        const longitudinalNormal = rotate([1, 0], this.angle + wheel.angle);\n        const longitudinalVelocity = multiply(dot(longitudinalNormal, wheelVelocity), longitudinalNormal);\n        const longitudinalFrictionForce = multiply(longitudinalVelocity, -0.9);\n        force = add(force, longitudinalFrictionForce);\n      }\n\n      // slide\n      const lateralNormal = rotate([0, 1], this.angle + wheel.angle);\n      const lateralVelocity = multiply(dot(lateralNormal, wheelVelocity), lateralNormal);\n      const lateralFrictionForce = multiply(lateralVelocity, -0.9);\n      force = add(force, lateralFrictionForce);\n\n      acceleration = add(acceleration, multiply(force, this.mass));\n      angularAcceleration = add(angularAcceleration, (wheelPosition[0] * force[1] - wheelPosition[1] * force[0]) / this.momentOfInertia);\n    });\n\n    // update velocity with new forces\n    this.velocity = add(this.velocity, multiply(acceleration, dt));\n    this.angularVelocity = add(this.angularVelocity, multiply(angularAcceleration, dt));\n\n    // update position with velocity\n    this.position = add(this.position, multiply(this.velocity, dt));\n    this.angle = add(this.angle, multiply(this.angularVelocity, dt));\n  }\n\n  draw(context) {\n    context.save();\n\n    context.translate(this.position[0], this.position[1]);\n    context.rotate(this.angle);\n    this.wheels.forEach((wheel) => this.drawWheel(wheel, context));\n\n    context.restore();\n  }\n\n  drawWheel(wheel, context) {\n    context.save();\n\n    context.translate(wheel.position[0], wheel.position[1]);\n    context.rotate(wheel.angle);\n    context.fillStyle = 'white';\n    context.fillRect(-this.wheelDiameter / 2, -this.wheelWidth / 2, this.wheelDiameter, this.wheelWidth);\n\n    context.restore();\n  }\n}\n\n\n//# sourceURL=webpack://car.io/./src/car/index.js?");

/***/ }),

/***/ "socket.io-client":
/*!*********************!*\
  !*** external "io" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = io;

/***/ }),

/***/ "mathjs":
/*!***********************!*\
  !*** external "math" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = math;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
(() => {
/*!*****************************!*\
  !*** ./src/client/index.js ***!
  \*****************************/
eval("const io = __webpack_require__(/*! socket.io-client */ \"socket.io-client\");\nconst { Car } = __webpack_require__(/*! ../car */ \"./src/car/index.js\");\n\nconst myId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {\n  const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8);\n  return v.toString(16);\n});\n\nconst socket = io.connect({ query: `id=${myId}` });\nsocket.on('connect', () => console.log('Socket connected'));\n\nconst canvas = document.getElementById('canvas');\ncanvas.width = window.innerWidth;\ncanvas.height = window.innerHeight;\nconst context = canvas.getContext('2d');\n\nconst keys = new Array(256);\nwindow.onkeydown = (event) => { keys[event.which] = true; };\nwindow.onkeyup = (event) => { keys[event.which] = false; };\n\nlet simRunning = false;\nlet simStep = 0;\nsocket.on('start', (event) => {\n  simRunning = true;\n  simStep = event;\n});\n\nconst cars = [];\n\nconst myCar = new Car(myId);\ncars.push(myCar);\n\nsocket.on('update', (event) => {\n  let car = cars.find((c) => c.id === event.id);\n  if (!car) {\n    car = new Car(event.id);\n    cars.push(car);\n  }\n  for (var k in event) {\n    car[k] = event[k];\n  }\n});\n\nsocket.on('delete', (id) => {\n  const index = cars.findIndex((car) => car.id === id);\n  if (index !== -1) {\n    cars.splice(index);\n  }\n});\n\nconst input = () => {\n  let dirty = false;\n  let event = {\n    simStep\n  };\n\n  let steerDirection = 0;\n  if (keys[65]) {\n    steerDirection = 1;\n  } else if (keys[68]) {\n    steerDirection = -1;\n  }\n\n  if (steerDirection !== myCar.steerDirection) {\n    event.steerDirection = steerDirection;\n    dirty = true;\n  }\n\n  if (keys[87] !== myCar.accelerate) {\n    event.accelerate = keys[87];\n    dirty = true;\n  }\n\n  if (keys[83] !== myCar.brake) {\n    event.brake = keys[83];\n    dirty = true;\n  }\n\n  // myCar.input(event, simStep);\n\n  if (dirty) {\n    socket.emit('input', event);\n  }\n};\n\nconst update = () => {\n  cars.forEach((car) => car.update());\n};\n\nconst loop = () => {\n  if (simRunning) {\n    input();\n    update();\n    simStep += 1;\n  }\n};\n\nconst simPeriod = 16;\nsetInterval(loop, simPeriod);\n\nconst draw = () => {\n  context.fillStyle = 'black';\n  context.fillRect(0, 0, canvas.width, canvas.height);\n\n  context.save();\n  context.translate(0, canvas.height);\n  context.scale(1, -1);\n  cars.forEach((car) => car.draw(context));\n  context.restore();\n\n  context.fillStyle = 'white';\n  context.fillText(`Step: ${simStep}`, 10, 15);\n\n  window.requestAnimationFrame(draw);\n};\n\ndraw();\n\n\n//# sourceURL=webpack://car.io/./src/client/index.js?");
})();

/******/ })()
;