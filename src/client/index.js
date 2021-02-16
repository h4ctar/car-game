/**
 * @typedef { import('../common/type').ScoreEvent } ScoreEvent
 * @typedef { import('../common/type').HealthEvent } HealthEvent
 * @typedef { import('../common/type').UpdateEvent } UpdateEvent
 * @typedef { import('../common/type').InputEvent } InputEvent
 * @typedef { import('../common/vector').Point2 } Point2
 * @typedef { import("../common/car").Car } Car
 */

const { SIM_PERIOD, TREE_RADIUS } = require('../common/config');
const { Simulation } = require('../common/simulation');
const {
  rotate, sub, add, grow,
} = require('../common/vector');
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

const treeImage = new Image();
treeImage.src = 'tree.svg';

const sim = new Simulation();

socket.on('start', (event) => {
  console.info('Received start event');
  // https://distributedsystemsblog.com/docs/clock-synchronization-algorithms/#christians-algorithm
  const rtt = Date.now() - event.requestTime;
  const skew = Math.round((rtt / 2) / SIM_PERIOD);
  console.info(`RTT: ${rtt}`);
  console.info(`Skew: ${skew}`);
  const clientSimStep = event.serverSimStep + skew;

  sim.start(clientSimStep);
});

socket.on('disconnect', () => sim.stop());

/** @type {Car} */
let myCar;

socket.on('update', (/** @type {UpdateEvent} */ event) => {
  let car = sim.getCar(event.id);
  if (!car) {
    console.log('New car', event.id);

    car = sim.addCar(event.id, event.username, event.color);

    if (car.id === myId) {
      myCar = car;
      hideStartCard();
      updateInfoCard(myCar);
    }
  }

  car.deserialize(event, sim.simStep);
});

socket.on('delete', (/** @type {string} */ id) => {
  console.info(`Delete car ${id}`);

  sim.deleteCar(id);

  if (id === myCar?.id) {
    myCar = undefined;
    showStartCard();
    hideInfoCard();
  }
});

socket.on('input', (/** @type {InputEvent} */ event) => {
  const car = sim.getCar(event.id);
  if (car) {
    car.processInput(event, sim.simStep);
  }
});

socket.on('score', (/** @type {ScoreEvent} */ event) => {
  const car = sim.getCar(event.id);
  if (car) {
    car.score = event.score;

    if (car.id === myId) {
      updateInfoCard(myCar);
    }
  }
});

socket.on('health', (/** @type {HealthEvent} */ event) => {
  const car = sim.getCar(event.id);
  if (car) {
    car.health = event.health;

    if (car.id === myId) {
      updateInfoCard(myCar);
    }
  }
});

socket.on('trees', (/** @type {Point2[]} */ trees) => {
  sim.setTrees(trees);
});

const inputLoop = () => {
  if (myCar) {
    checkInput(myCar, sim.simStep);
  }
};
setInterval(inputLoop, SIM_PERIOD);

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
    sim.cars
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
  if (sim.simRunning) {
    const camera = myCar ? myCar.position : { x: 0, y: 0 };
    const viewport = {
      x: camera.x - canvas.width / 2,
      y: camera.y - canvas.height / 2,
      width: canvas.width,
      height: canvas.height,
    };

    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMap(camera);

    context.save();
    context.translate(canvas.width / 2, canvas.height - canvas.height / 2);
    context.scale(1, -1);

    context.translate(-camera.x, -camera.y);

    sim.cars.forEach((car) => car.draw(context));

    const visibleTreeRange = grow(viewport, TREE_RADIUS);
    sim.getTrees(visibleTreeRange).forEach((tree) => {
      context.drawImage(treeImage, tree.point.x - treeImage.width / 2, tree.point.y - treeImage.height / 2);

      // todo: draw debug circle
      context.beginPath();
      context.arc(tree.point.x, tree.point.y, TREE_RADIUS, 0, 2 * Math.PI);
      context.stroke();
    });

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
