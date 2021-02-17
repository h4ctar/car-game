/**
 * @typedef { import("../common/type").JoinEvent } JoinEvent
 * @typedef { import("../common/type").InputEvent } InputEvent
 * @typedef { import("../common/type").ScoreboardEvent } ScoreboardEvent
 * @typedef { import("../common/type").ScoreEvent } ScoreEvent
 * @typedef { import("../common/type").HealthEvent } HealthEvent
 * @typedef { import("../common/vector").Point2 } Point2
 * @typedef { import("../common/car").Car } Car
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { SCOREBOARD_LENGTH, WORLD_WIDTH, WORLD_HEIGHT } = require('../common/config');
const { ServerSimulation } = require('./simulation');

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { serveClient: false });

const sim = new ServerSimulation();
sim.start(0);
sim.on('delete-car', (id) => ioServer.emit('delete', id));

const trees = [];
for (let i = 0; i < 1000; i += 1) {
  const tree = {
    x: Math.random() * WORLD_WIDTH,
    y: Math.random() * WORLD_HEIGHT,
  };
  trees.push(tree);
}
sim.setTrees(trees);

/**
 * @type {() => ScoreboardEvent}
 */
const createScoreboard = () => {
  const scoreboard = sim.cars
    .map((car) => ({ username: car.username, score: car.score }))
    .sort((a, b) => b.score - a.score);
  scoreboard.length = SCOREBOARD_LENGTH;
  scoreboard.fill({ username: '', score: 0 }, sim.cars.length, SCOREBOARD_LENGTH);
  return scoreboard;
};

ioServer.on('connection', (socket) => {
  // eslint-disable-next-line no-underscore-dangle
  const id = socket.request._query.id;

  console.log(`New client connected ${id}`);

  /** @type {NodeJS.Timeout} */
  let syncInterval;

  // todo: type here
  socket.on('start', (event) => {
    console.info('Client starting simulation');
    socket.emit('start', {
      requestTime: event.requestTime,
      serverSimStep: sim.simStep,
    });

    syncInterval = setInterval(() => {
      // todo: only cars near this car
      // todo: delete cars far away
      sim.cars.forEach((c) => socket.emit('update', c.serialize()));
    }, 1000);

    // send the trees
    socket.emit('trees', trees);

    // send the initial scoreboard
    socket.emit('scoreboard', createScoreboard());
  });

  socket.on('ping', () => socket.emit('pong'));

  /** @type {Car} */
  let car;

  socket.on('join', (/** @type {JoinEvent} */ event) => {
    console.info(`Client joining ${event.username}`);
    car = sim.addCar(id, event.username, event.color);

    car.on('health', () => {
      /** @type {HealthEvent} */
      const healthEvent = { id, health: car.health };
      ioServer.emit('health', healthEvent);
    });

    car.on('score', () => {
      /** @type {ScoreEvent} */
      const scoreEvent = { id, score: car.score };
      ioServer.emit('score', scoreEvent);

      ioServer.emit('scoreboard', createScoreboard());
    });

    car.position = {
      x: Math.random() * WORLD_WIDTH,
      y: Math.random() * WORLD_HEIGHT,
    };

    // send an updated scoreboard including the new car
    ioServer.emit('scoreboard', createScoreboard());

    ioServer.emit('update', car.serialize());
  });

  socket.on('input', (/** @type {InputEvent} */ event) => {
    console.log(`received input - ${event.simStep} ${sim.simStep}`);
    if (car) {
      car.processInput(event, sim.simStep);

      // send the input to everyone except the sender because they have already processed it
      ioServer.emit('input', event);
    }
  });

  socket.on('disconnect', () => {
    console.info(`Client disconnected ${id}`);

    if (car) {
      sim.deleteCar(id);
    }

    if (syncInterval) {
      clearInterval(syncInterval);
    }
  });
});

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
