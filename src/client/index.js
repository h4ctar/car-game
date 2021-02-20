/**
 * @typedef { import('../common/type').ScoreEvent } ScoreEvent
 * @typedef { import('../common/type').HealthEvent } HealthEvent
 * @typedef { import('../common/type').UpdateEvent } UpdateEvent
 * @typedef { import('../common/type').InputEvent } InputEvent
 * @typedef { import('../common/vector').Point2 } Point2
 * @typedef { import('../common/vector').Box } Box
 * @typedef { import("../common/car").Car } Car
 */

const {
  SIM_PERIOD, TREE_RADIUS, TREE_TYPE: QT_TREE, ROCK_TYPE: QT_ROCK, ROCK_RADIUS,
} = require('../common/config');
const { Simulation } = require('../common/simulation');
const {
  rotate, sub, add, grow,
} = require('../common/vector');
const { myId } = require('./id');
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

const rockImage = new Image();
rockImage.src = 'rock.svg';

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
  }
});

socket.on('health', (/** @type {HealthEvent} */ event) => {
  const car = sim.getCar(event.id);
  if (car) {
    car.health = event.health;
  }
});

socket.on('static-entities', (staticEntities) => staticEntities.forEach((entity) => sim.quadtree.insert(entity.type, entity.point)));

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

/**
 * Draw all the objects of a single type.
 * @param {Box} viewport the visible viewport
 * @param {number} type the type of object to draw
 * @param {number} radius the radius of the object
 * @param {HTMLImageElement} image the image to draw
 */
const drawObjects = (viewport, type, radius, image) => {
  const visibleRange = grow(viewport, radius);
  const objects = sim.quadtree.query(type, visibleRange);
  objects.forEach((object) => {
    context.drawImage(image, object.point.x - image.width / 2, object.point.y - image.height / 2);

    if (process.env.NODE_ENV !== 'production') {
      context.beginPath();
      context.arc(object.point.x, object.point.y, radius, 0, 2 * Math.PI);
      context.stroke();
    }
  });
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

const drawScore = () => {
  if (myCar) {
    context.save();
    context.fillStyle = myCar.color;
    context.font = '30px Arial';
    context.fillText(String(myCar.score), 10, 30);
    context.restore();
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

    drawObjects(viewport, QT_TREE, TREE_RADIUS, treeImage);
    drawObjects(viewport, QT_ROCK, ROCK_RADIUS, rockImage);

    context.restore();

    drawRadar();
    drawScore();
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
