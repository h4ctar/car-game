/**
 * @typedef { import('../type').ScoreEvent } ScoreEvent
 * @typedef { import('../type').HealthEvent } HealthEvent
 * @typedef { import('../type').UpdateEvent } UpdateEvent
 * @typedef { import('../vector').Point2 } Point2
 */

const { Car } = require('../car');
const { rotate, sub, add } = require('../vector');
const { myId } = require('./id');
const { updateInfoCard, hideInfoCard } = require('./info-card');
const { checkInput } = require('./input');
const { socket } = require('./socket');
const { hideStartCard, showStartCard } = require('./start-card');
require('./input');
require('./scoreboard-card');

const canvas = /** @type { HTMLCanvasElement } */ (document.getElementById('canvas'));
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const context = canvas.getContext('2d');

const SIM_PERIOD = 16;
let simRunning;
let simStep;
let simStartStep;
let simStartTime;
socket.on('start', (event) => {
  console.info(`Start simulation ${event}`);

  simRunning = true;
  simStep = event;
  simStartStep = event;
  simStartTime = Date.now();
});

/** @type { Car[] } */
const cars = [];

/** @type { Car } */
let myCar;

socket.on('update', (/** @type {UpdateEvent} */ event) => {
  console.log('Received update');
  let car = cars.find((c) => c.id === event.id);
  if (!car) {
    console.log('New car', event.id);

    car = new Car(event.id, event.username, event.color);
    cars.push(car);

    if (car.id === myId) {
      myCar = car;
      hideStartCard();
      updateInfoCard(myCar);
    }
  }

  car.deserialize(event, simStep);
});

socket.on('delete', (/** @type {string} */ id) => {
  console.info(`Delete car ${id}`);

  const index = cars.findIndex((car) => car.id === id);
  if (index !== -1) {
    cars.splice(index, 1);
  }

  if (id === myCar?.id) {
    myCar = undefined;
    showStartCard();
    hideInfoCard();
  }
});

socket.on('input', (event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.processInput(event, simStep);
  }
});

socket.on('score', (/** @type {ScoreEvent} */ event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.score = event.score;

    if (car.id === myId) {
      updateInfoCard(myCar);
    }
  }
});

socket.on('health', (/** @type {HealthEvent} */ event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.health = event.health;

    if (car.id === myId) {
      updateInfoCard(myCar);
    }
  }
});

const update = () => {
  cars.forEach((car) => car.update(simStep));
};

// simulation loop with fixed step
const loop = () => {
  if (simRunning) {
    const desiredSimStep = Math.floor(simStartStep + (Date.now() - simStartTime) / SIM_PERIOD);
    if (desiredSimStep - simStep > 100) {
      console.error('Missed too many simulation steps');
      simRunning = false;
      socket.close();
    }

    while (simStep < desiredSimStep) {
      update();
      simStep += 1;
    }

    checkInput(myCar, simStep);
  }
};
setInterval(loop, SIM_PERIOD);

/**
 * @param {Point2} camera
 */
const drawMap = (camera) => {
  const GRID_SIZE = 200;
  context.beginPath();
  context.strokeStyle = 'grey';
  for (let x = -(camera.x % GRID_SIZE); x < canvas.width; x += GRID_SIZE) {
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
  }
  for (let y = camera.y % GRID_SIZE; y < canvas.height; y += GRID_SIZE) {
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
  }
  context.stroke();
};

const drawRadar = () => {
  if (myCar) {
    const radarRadius = 100;
    cars
      .filter((car) => car !== myCar)
      .forEach((car) => {
        const v = sub(car.position, myCar.position);
        const angle = Math.atan2(-v.y, v.x);
        const blipPosition = add(rotate({ x: radarRadius, y: 0 }, angle), { x: canvas.width / 2, y: canvas.height / 2 });

        context.fillStyle = car.color;
        context.fillRect(blipPosition.x, blipPosition.y, 4, 4);
      });
  }
};

const draw = () => {
  if (simRunning) {
    const camera = myCar ? myCar.position : { x: 0, y: 0 };

    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMap(camera);

    context.save();
    context.translate(canvas.width / 2, canvas.height - canvas.height / 2);
    context.scale(1, -1);

    context.translate(-camera.x, -camera.y);

    cars.forEach((car) => car.draw(context));
    context.restore();

    drawRadar();
  }

  window.requestAnimationFrame(draw);
};
draw();

// register the service worker
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator
      .serviceWorker
      .register('service-worker.js');
  }
});
