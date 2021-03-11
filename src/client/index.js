/**
 * @typedef { import('../common/type').ScoreEvent } ScoreEvent
 * @typedef { import('../common/type').Scoreboard } Scoreboard
 * @typedef { import('../common/type').HealthEvent } HealthEvent
 * @typedef { import('../common/type').UpdateEvent } UpdateEvent
 * @typedef { import('../common/type').CarInputEvent } CarInputEvent
 * @typedef { import('../common/type').PingEvent } PingEvent
 * @typedef { import('../common/type').PongEvent } PongEvent
 * @typedef { import('../common/vector').Point2 } Point2
 * @typedef { import('../common/vector').Box } Box
 * @typedef { import("../common/car").Car } Car
 */

const $ = require('jquery');
const {
  SIM_PERIOD, TREE_RADIUS, TREE_TYPE, ROCK_TYPE, ROCK_RADIUS, PICKUP_TYPE, PICKUP_RADIUS,
} = require('../common/config');
const { Simulation } = require('../common/simulation');
const {
  rotate, sub, add, grow,
} = require('../common/vector');
const { myId } = require('./id');
const { checkInput } = require('./input');
const { socket } = require('./socket');
const { hideStartCard, showStartCard } = require('./start-card');

const canvas = $('#canvas');
canvas.prop('width', window.innerWidth);
canvas.prop('height', window.innerHeight);
window.addEventListener('resize', () => {
  canvas.prop('width', window.innerWidth);
  canvas.prop('height', window.innerHeight);
});

// @ts-ignore
const context = canvas[0].getContext('2d');

const treeImage = new Image();
treeImage.src = 'tree.svg';

const rockImage = new Image();
rockImage.src = 'rock.svg';

const pickupImage = new Image();
pickupImage.src = 'pickup.svg';

const sim = new Simulation();

/** @type {Scoreboard} */
let scoreboard = [];

socket.on('start', (event) => sim.start(event.startSimTime, event.currentSimStep));

socket.on('disconnect', () => sim.stop());

// https://distributedsystemsblog.com/docs/clock-synchronization-algorithms/#christians-algorithm
setInterval(() => {
  /** @type {PingEvent} */
  const event = { pingTime: Date.now() };
  socket.emit('ping', event);
}, 1000);

let latency = 0;
socket.on('pong', (/** @type {PongEvent} */ event) => {
  const clientTime = Date.now();
  const rtt = clientTime - event.pingTime;
  latency = rtt / 2;
  const serverTime = event.pongTime + latency;
  const oldTimeSkew = sim.timeSkew;
  const newTimeSkew = clientTime - serverTime;
  sim.timeSkew = oldTimeSkew * 0.9 + newTimeSkew * 0.1;
});

/** @type {Car} */
let myCar;

socket.on('update-car', (/** @type {UpdateEvent} */ event) => {
  let car = sim.getCar(event.id);

  if (!car) {
    console.info('New car', event.id);

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

socket.on('input', (/** @type {CarInputEvent} */ event) => {
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

socket.on('scoreboard', (/** @type {Scoreboard} */ newScoreboard) => {
  scoreboard = newScoreboard;
});

socket.on('health', (/** @type {HealthEvent} */ event) => {
  const car = sim.getCar(event.id);
  if (car) {
    car.health = event.health;
  }
});

socket.on('entities', (entities) => entities.forEach((entity) => sim.addEntity(entity.type, entity.point, entity.id)));
socket.on('new-entity', (entity) => sim.addEntity(entity.type, entity.point, entity.id));
socket.on('delete-entity', (/** @type {number} */ id) => sim.deleteEntity(id));

const inputLoop = () => {
  if (myCar) {
    checkInput(myCar, sim.simStep);
  }
};
setInterval(inputLoop, SIM_PERIOD);

/**
 * @param {Point2} camera the position of the camera
 * @returns {void}
 */
const drawMap = (camera) => {
  const GRID_SIZE = 200;
  context.beginPath();
  context.strokeStyle = 'grey';
  for (let x = -(camera.x % GRID_SIZE); x < canvas.width(); x += GRID_SIZE) {
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height());
  }
  for (let y = camera.y % GRID_SIZE; y < canvas.height(); y += GRID_SIZE) {
    context.moveTo(0, y);
    context.lineTo(canvas.width(), y);
  }
  context.stroke();
};

/**
 * Draw all the objects of a single type.
 * @param {Box} viewport the visible viewport
 * @param {number} type the type of object to draw
 * @param {number} radius the radius of the object
 * @param {HTMLImageElement} image the image to draw
 * @returns {void}
 */
const drawObjects = (viewport, type, radius, image) => {
  const visibleRange = grow(viewport, radius);
  const objects = sim.queryEntities(type, visibleRange);
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
        const blipPosition = add(rotate({ x: radarRadius, y: 0 }, angle), { x: canvas.width() / 2, y: canvas.height() / 2 });

        context.fillStyle = car.color;
        context.fillRect(blipPosition.x, blipPosition.y, 4, 4);
      });
  }
};

const drawScore = () => {
  if (myCar) {
    context.save();
    context.fillStyle = myCar.color;
    context.font = '30px monospace';
    context.fillText(String(myCar.score), 10, 30);
    context.restore();
  }
};

const drawScoreboard = () => {
  if (scoreboard) {
    context.save();
    context.font = '16px monospace';
    scoreboard.forEach((entry, index) => {
      const username = entry.username.substring(0, 14).padEnd(14);
      const score = String(entry.score).padStart(5);
      context.fillStyle = entry.color;
      context.fillText(`${username} ${score}`, canvas.width() - 200, 30 + index * 20);
    });
    context.restore();
  }
};

const drawDebug = () => {
  if (process.env.NODE_ENV !== 'production') {
    context.save();
    context.fillStyle = 'white';
    context.font = '16px monospace';
    context.fillText(`Latency: ${Math.round(latency)}`, 10, 50);
    context.fillText(`Time skew: ${Math.round(sim.timeSkew)}`, 10, 70);
    context.fillText(`Sync error: ${myCar && myCar.syncError}`, 10, 90);
    context.fillText(`Speed: ${myCar && Math.round(myCar.speed)}`, 10, 110);
    context.restore();
  }
};

const draw = () => {
  if (sim.simRunning) {
    const camera = myCar ? myCar.position : { x: 0, y: 0 };
    const viewport = {
      x: camera.x - canvas.width() / 2,
      y: camera.y - canvas.height() / 2,
      width: canvas.width(),
      height: canvas.height(),
    };

    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width(), canvas.height());

    drawMap(camera);

    context.save();
    context.translate(canvas.width() / 2, canvas.height() - canvas.height() / 2);
    context.scale(1, -1);

    context.translate(-camera.x, -camera.y);

    sim.cars.forEach((car) => car.draw(context));

    drawObjects(viewport, TREE_TYPE, TREE_RADIUS, treeImage);
    drawObjects(viewport, ROCK_TYPE, ROCK_RADIUS, rockImage);
    drawObjects(viewport, PICKUP_TYPE, PICKUP_RADIUS, pickupImage);

    context.restore();

    drawRadar();
    drawScore();
    drawScoreboard();
    drawDebug();
  }

  window.requestAnimationFrame(draw);
};
draw();

// register the service worker
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator
      .serviceWorker
      .register('service-worker.js')
      .then((registration) => console.log('Service worker registration successful, scope is:', registration.scope))
      .catch((error) => console.log('Service worker registration failed, error:', error));
  }
});
