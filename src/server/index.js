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
// const { deserializeInputEvent } = require('../common/type');
const { ServerSimulation } = require('./simulation');

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { serveClient: false });

const sim = new ServerSimulation();
sim.start(0);

sim.addEventListener('delete-car', (event) => {
  // @ts-ignore
  ioServer.emit('delete', event.data);
});

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

  // todo: type here
  socket.on('start', (event) => {
    console.info('Client starting simulation');
    socket.emit('start', {
      requestTime: event.requestTime,
      serverSimStep: sim.simStep,
    });
  });

  socket.on('ping', () => socket.emit('pong'));

  // send all cars to the new client
  sim.cars.forEach((c) => socket.emit('update', c.serialize()));

  // send the trees
  socket.emit('trees', trees);

  // send the initial scoreboard
  socket.emit('scoreboard', createScoreboard());

  /** @type {Car} */
  let car;

  socket.on('join', (/** @type {JoinEvent} */ event) => {
    console.info(`Client joining ${event.username}`);
    car = sim.addCar(id, event.username, event.color);

    car.addEventListener('health', () => {
      /** @type {import("../common/type").HealthEvent} */
      const healthEvent = { id, health: car.health };
      ioServer.emit('health', healthEvent);
    });

    car.addEventListener('score', () => {
      /** @type {import("../common/type").ScoreEvent} */
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
    // socket.on('input', (/** @type {ArrayBuffer} */ buffer) => {
    if (car) {
      // const event = deserializeInputEvent(buffer);
      car.processInput(event, sim.simStep);

      // send the input to everyone except the sender because they have already processed it
      socket.broadcast.emit('input', event);
    }
  });

  socket.on('disconnect', () => {
    console.info(`Client disconnected ${id}`);
    if (car) {
      sim.deleteCar(id);
    }
  });
});

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
