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

eval("const {\n  add, atan, dot, multiply, rotate,\n} = __webpack_require__(/*! mathjs */ \"mathjs\");\n\nconst tween = (currentValue, targetValue, step) => {\n  let newValue = currentValue;\n  if (currentValue > targetValue) {\n    newValue = currentValue - step;\n    if (newValue < targetValue) {\n      newValue = targetValue;\n    }\n  } else if (currentValue < targetValue) {\n    newValue = currentValue + step;\n    if (newValue > targetValue) {\n      newValue = targetValue;\n    }\n  }\n  return newValue;\n};\n\nconst WHEEL_FL = 0;\nconst WHEEL_FR = 1;\nconst WHEEL_RL = 2;\nconst WHEEL_RR = 3;\n\nconst DT = 0.016;\n\nexports.Car = class {\n  constructor(id) {\n    this.id = id;\n\n    this.histories = [];\n    this.futureInputs = [];\n\n    this.position = [0, 0];\n    this.angle = 0;\n    this.velocity = [0, 0];\n    this.angularVelocity = 0;\n    this.steerDirection = 0;\n    this.accelerate = false;\n    this.brake = false;\n    this.wheelbase = 50;\n    this.track = 25;\n    this.mass = 2;\n    this.momentOfInertia = (this.mass / 12) * (this.wheelbase * this.wheelbase + this.track * this.track);\n\n    this.wheelWidth = 8;\n    this.wheelDiameter = 16;\n\n    this.wheels = new Array(4);\n    this.wheels[WHEEL_FL] = {\n      position: [this.wheelbase / 2, -this.track / 2],\n      angle: 0,\n    };\n    this.wheels[WHEEL_FR] = {\n      position: [this.wheelbase / 2, this.track / 2],\n      angle: 0,\n    };\n    this.wheels[WHEEL_RL] = {\n      position: [-this.wheelbase / 2, -this.track / 2],\n      angle: 0,\n    };\n    this.wheels[WHEEL_RR] = {\n      position: [-this.wheelbase / 2, this.track / 2],\n      angle: 0,\n    };\n  }\n\n  processInput(event, currentSimStep) {\n    if (event.simStep > currentSimStep) {\n      console.warn(`received future event ${event.simStep} ${currentSimStep}`);\n\n      this.futureInputs.push(event);\n    } else if (event.simStep === currentSimStep) {\n      this.steerDirection = event.steerDirection === undefined ? this.steerDirection : event.steerDirection;\n      this.accelerate = event.accelerate === undefined ? this.accelerate : event.accelerate;\n      this.brake = event.brake === undefined ? this.brake : event.brake;\n    } else {\n      // go back in history to find when the input should be applied\n      // note: when an input event comes in it will clobber previous input events that have a later sim step\n      // todo: make this more effecient (does not need to loop, can calculate the index)\n      let historyIndex = this.histories.findIndex((history) => history.simStep === event.simStep);\n\n      if (historyIndex === -1) {\n        console.warn(`received old event ${event.simStep} ${currentSimStep}`);\n        historyIndex = 0;\n      }\n\n      const history = this.histories[historyIndex];\n\n      // remove history after this history point (including this point)\n      this.histories.splice(historyIndex);\n\n      // reset this to the history point\n      this.position = history.position;\n      this.angle = history.angle;\n      this.velocity = history.velocity;\n      this.angularVelocity = history.angularVelocity;\n      this.steerDirection = history.steerDirection;\n      this.accelerate = history.accelerate;\n      this.brake = history.brake;\n      this.wheels = history.wheels.map((wheel) => ({ ...wheel }));\n\n      // apply the input\n      this.steerDirection = event.steerDirection === undefined ? this.steerDirection : event.steerDirection;\n      this.accelerate = event.accelerate === undefined ? this.accelerate : event.accelerate;\n      this.brake = event.brake === undefined ? this.brake : event.brake;\n\n      // step forward until now\n      let { simStep } = history;\n      while (simStep < currentSimStep) {\n        this.update(simStep);\n        simStep += 1;\n      }\n    }\n  }\n\n  update(simStep) {\n    // todo: instead of this ugly only put input for events that are good\n    // also, make sure they go in the correct order\n    const futureInputs = [...this.futureInputs];\n    this.futureInputs.length = 0;\n    futureInputs.forEach((event) => this.processInput(event, simStep));\n\n    // add history to start of histories queue\n    this.histories.push({\n      simStep,\n      position: this.position,\n      angle: this.angle,\n      velocity: this.velocity,\n      angularVelocity: this.angularVelocity,\n      steerDirection: this.steerDirection,\n      accelerate: this.accelerate,\n      brake: this.brake,\n      wheels: this.wheels.map((wheel) => ({ ...wheel })),\n    });\n\n    // check that the history is complete\n    // todo: only if development\n    for (let i = 1; i < this.histories.length; i += 1) {\n      if (this.histories[i].simStep - this.histories[i - 1].simStep !== 1) {\n        console.log(i, this.histories[i - 1], this.histories[i]);\n        throw Error('History is out of order');\n      }\n    }\n\n    // make sure it never gets too long\n    while (this.histories.length > 100) {\n      // remove history from the end of the queue\n      this.histories.shift();\n    }\n\n    // steer the wheels\n    // ackerman https://datagenetics.com/blog/december12016/index.html\n    let targetLeftAngle = 0;\n    let targetRightAngle = 0;\n    if (this.steerDirection !== 0) {\n      const turnRadius = 120;\n      targetLeftAngle = this.steerDirection * atan(this.wheelbase / (turnRadius + this.steerDirection * this.track / 2));\n      targetRightAngle = this.steerDirection * atan(this.wheelbase / (turnRadius - this.steerDirection * this.track / 2));\n    }\n\n    this.wheels[WHEEL_FL].angle = tween(this.wheels[WHEEL_FL].angle, targetLeftAngle, 4 * DT);\n    this.wheels[WHEEL_FR].angle = tween(this.wheels[WHEEL_FR].angle, targetRightAngle, 4 * DT);\n\n    // todo: power curve\n    // todo: reverse\n    const wheelForce = this.accelerate ? 200 : 0;\n\n    // calculate the acceleration\n    let acceleration = [0, 0];\n    let angularAcceleration = 0;\n    this.wheels.forEach((wheel) => {\n      const wheelPosition = rotate(wheel.position, this.angle);\n      const wheelVelocity = add(this.velocity, multiply([-wheelPosition[1], wheelPosition[0]], this.angularVelocity));\n\n      // power\n      let force = rotate([wheelForce, 0], this.angle + wheel.angle);\n\n      // brake\n      const longitudinalFrictionConstant = this.brake ? 0.9 : 0.1;\n      const longitudinalNormal = rotate([1, 0], this.angle + wheel.angle);\n      const longitudinalVelocity = multiply(dot(longitudinalNormal, wheelVelocity), longitudinalNormal);\n      const longitudinalFrictionForce = multiply(longitudinalVelocity, -longitudinalFrictionConstant);\n      force = add(force, longitudinalFrictionForce);\n\n      // slide\n      const lateralFrictionConstant = 1;\n      const lateralNormal = rotate([0, 1], this.angle + wheel.angle);\n      const lateralVelocity = multiply(dot(lateralNormal, wheelVelocity), lateralNormal);\n      const lateralFrictionForce = multiply(lateralVelocity, -lateralFrictionConstant);\n      force = add(force, lateralFrictionForce);\n\n      acceleration = add(acceleration, multiply(force, this.mass));\n      angularAcceleration = add(angularAcceleration, (wheelPosition[0] * force[1] - wheelPosition[1] * force[0]) / this.momentOfInertia);\n    });\n\n    // update velocity with new forces\n    this.velocity = add(this.velocity, multiply(acceleration, DT));\n    this.angularVelocity = add(this.angularVelocity, multiply(angularAcceleration, DT));\n\n    // update position with velocity\n    this.position = add(this.position, multiply(this.velocity, DT));\n    this.angle = add(this.angle, multiply(this.angularVelocity, DT));\n  }\n\n  draw(context) {\n    context.save();\n\n    context.translate(this.position[0], this.position[1]);\n    context.rotate(this.angle);\n    this.wheels.forEach((wheel) => this.drawWheel(wheel, context));\n\n    context.restore();\n  }\n\n  drawWheel(wheel, context) {\n    context.save();\n\n    context.translate(wheel.position[0], wheel.position[1]);\n    context.rotate(wheel.angle);\n    context.fillStyle = 'white';\n    context.fillRect(-this.wheelDiameter / 2, -this.wheelWidth / 2, this.wheelDiameter, this.wheelWidth);\n\n    context.restore();\n  }\n};\n\n\n//# sourceURL=webpack://car.io/./src/car/index.js?");

/***/ }),

/***/ "pixi.js":
/*!***********************!*\
  !*** external "PIXI" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = PIXI;

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
eval("const io = __webpack_require__(/*! socket.io-client */ \"socket.io-client\");\nconst PIXI = __webpack_require__(/*! pixi.js */ \"pixi.js\");\nconst { Car } = __webpack_require__(/*! ../car */ \"./src/car/index.js\");\n\nconst myId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {\n  // eslint-disable-next-line no-bitwise, no-mixed-operators\n  const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8);\n  return v.toString(16);\n});\nconsole.info(`id ${myId}`);\n\nPIXI.Loader.shared\n  .add('car.png')\n  .load(() => {\n    console.log('Sprites loaded');\n\n    const socket = io.connect({ query: `id=${myId}` });\n    socket.on('connect', () => console.log('Socket connected'));\n\n    const canvas = document.getElementById('canvas');\n    const app = new PIXI.Application({ view: canvas, autoResize: true });\n    app.renderer.resize(window.innerWidth, window.innerHeight);\n\n    const keys = new Array(256).fill(false);\n    window.onkeydown = (event) => { keys[event.which] = true; };\n    window.onkeyup = (event) => { keys[event.which] = false; };\n\n    const SIM_PERIOD = 16;\n    let simRunning;\n    let simStep;\n    let simStartStep;\n    let simStartTime;\n    socket.on('start', (event) => {\n      console.info(`start ${event}`);\n      simRunning = true;\n      simStep = event;\n      simStartStep = event;\n      simStartTime = Date.now();\n    });\n\n    const cars = [];\n\n    let myCar;\n\n    socket.on('update', (event) => {\n      let car = cars.find((c) => c.id === event.id);\n      if (!car) {\n        console.log('New car', event.id);\n\n        car = new Car(event.id);\n        car.sprite = new PIXI.Sprite(PIXI.utils.TextureCache['car.png']);\n        car.sprite.width = car.wheelbase;\n        car.sprite.height = car.track;\n        car.sprite.anchor.x = 0.5;\n        car.sprite.anchor.y = 0.5;\n        app.stage.addChild(car.sprite);\n\n        cars.push(car);\n\n        if (car.id === myId) {\n          myCar = car;\n        }\n      }\n\n      car.position = event.position;\n      car.angle = event.angle;\n      car.velocity = event.velocity;\n      car.angularVelocity = event.angularVelocity;\n      car.steerDirection = event.steerDirection;\n      car.accelerate = event.accelerate;\n      car.brake = event.brake;\n      car.wheels = event.wheels;\n      car.histories = event.histories;\n    });\n\n    socket.on('delete', (id) => {\n      console.info(`delete car ${id}`);\n\n      const index = cars.findIndex((car) => car.id === id);\n      if (index !== -1) {\n        cars.splice(index);\n      }\n    });\n\n    socket.on('input', (event) => {\n      const car = cars.find((c) => c.id === event.id);\n      if (car) {\n        car.processInput(event, simStep);\n      }\n    });\n\n    const checkKeyInput = () => {\n      let dirty = false;\n      const event = {\n        id: myId,\n        simStep,\n      };\n\n      let steerDirection = 0;\n      if (keys[65]) {\n        steerDirection = 1;\n      } else if (keys[68]) {\n        steerDirection = -1;\n      }\n\n      if (steerDirection !== myCar.steerDirection) {\n        event.steerDirection = steerDirection;\n        dirty = true;\n      }\n\n      if (keys[87] !== myCar.accelerate) {\n        event.accelerate = keys[87];\n        dirty = true;\n      }\n\n      if (keys[83] !== myCar.brake) {\n        event.brake = keys[83];\n        dirty = true;\n      }\n\n      if (dirty) {\n        myCar.processInput(event, simStep);\n        socket.emit('input', event);\n      }\n    };\n\n    const update = () => {\n      cars.forEach((car) => car.update(simStep));\n    };\n\n    const draw = () => {\n      cars.forEach((car) => {\n        car.sprite.position.set(car.position[0], app.view.height - car.position[1]);\n        car.sprite.rotation = -car.angle;\n      });\n    };\n\n    // simulation loop with fixed step\n    const loop = () => {\n      if (simRunning) {\n        const desiredSimStep = simStartStep + (Date.now() - simStartTime) / SIM_PERIOD;\n        // todo: kill if too many steps required\n        while (simStep < desiredSimStep) {\n          update();\n          simStep += 1;\n        }\n        draw();\n        checkKeyInput();\n      }\n    };\n    setInterval(loop, SIM_PERIOD);\n\n    const debugText = new PIXI.Text('', {\n      fontFamily: 'Arial', fontSize: 24, fill: 0xff1010, align: 'center',\n    });\n    app.stage.addChild(debugText);\n\n    let pingTime;\n    setInterval(() => {\n      pingTime = Date.now();\n      socket.emit('ping');\n    }, 1000);\n    socket.on('pong', () => {\n      const latency = Date.now() - pingTime;\n      debugText.text = `Step: ${simStep}, Latency: ${latency}`;\n    });\n  });\n\n\n//# sourceURL=webpack://car.io/./src/client/index.js?");
})();

/******/ })()
;