/**
 * @typedef { import("../common/type").JoinEvent } JoinEvent
 * @typedef { import("../common/type").InputEvent } InputEvent
 * @typedef { import("../common/type").Scoreboard } Scoreboard
 * @typedef { import("../common/type").ScoreEvent } ScoreEvent
 * @typedef { import("../common/type").HealthEvent } HealthEvent
 * @typedef { import("../common/vector").Point2 } Point2
 * @typedef { import("../common/car").Car } Car
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {
  SCOREBOARD_LENGTH, WORLD_WIDTH, WORLD_HEIGHT, TREE_TYPE, ROCK_TYPE,
} = require('../common/config');
const { randomPoint } = require('../common/util');
const { ServerSimulation } = require('./simulation');

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { serveClient: false });

const sim = new ServerSimulation();
sim.start(Date.now(), 0);
sim.on('delete-car', (id) => ioServer.emit('delete', id));

const staticEntities = [];
for (let i = 0; i < 1000; i += 1) {
  staticEntities.push({
    type: TREE_TYPE,
    point: randomPoint(),
  });
  staticEntities.push({
    type: ROCK_TYPE,
    point: randomPoint(),
  });
}
staticEntities.forEach((entity) => sim.quadtree.insert(entity.type, entity.point));

/**
 * @type {() => Scoreboard}
 */
const createScoreboard = () => {
  const scoreboard = sim.cars
    .map((car) => ({ username: car.username, score: car.score, color: car.color }))
    .sort((a, b) => b.score - a.score);

  if (scoreboard.length > SCOREBOARD_LENGTH) {
    scoreboard.length = SCOREBOARD_LENGTH;
  }

  return scoreboard;
};

ioServer.on('connection', (socket) => {
  // eslint-disable-next-line no-underscore-dangle
  const id = socket.request._query.id;

  console.log(`New client connected ${id}`);

  socket.emit('start', {
    startSimTime: sim.startSimTime,
    currentSimStep: sim.simStep,
  });

  sim.cars.forEach((c) => socket.emit('update', c.serialize()));
  const syncInterval = setInterval(() => {
    // todo: only cars near this car
    // todo: delete cars far away
    // todo: only if they've drifted
    sim.cars.forEach((c) => socket.emit('update', c.serialize()));
  }, 10000);

  socket.emit('static-entities', staticEntities);

  // send the initial scoreboard
  socket.emit('scoreboard', createScoreboard());

  socket.on('ping', (event) => socket.emit('pong', { ...event, pongTime: Date.now() }));

  /** @type {Car} */
  let car;

  socket.on('join', (/** @type {JoinEvent} */ event) => {
    console.info(`Client joining ${event.username}`);
    car = sim.addCar(id, event.username, event.color);

    car.on('collide', () => {
      car.health -= 10;
      // collisions make it go out of sync
      ioServer.emit('update', car.serialize());
    });

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
      // x: Math.random() * WORLD_WIDTH,
      // y: Math.random() * WORLD_HEIGHT,
      x: WORLD_WIDTH / 2,
      y: WORLD_HEIGHT / 2,
    };

    // send an updated scoreboard including the new car
    ioServer.emit('scoreboard', createScoreboard());

    ioServer.emit('update', car.serialize());
  });

  socket.on('input', (/** @type {InputEvent} */ event) => {
    if (car) {
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

    if (syncInterval) {
      clearInterval(syncInterval);
    }
  });
});

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
