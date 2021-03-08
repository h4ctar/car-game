/**
 * @typedef { import("../common/type").JoinEvent } JoinEvent
 * @typedef { import("../common/type").InputEvent } InputEvent
 * @typedef { import("../common/type").Scoreboard } Scoreboard
 * @typedef { import("../common/type").ScoreEvent } ScoreEvent
 * @typedef { import("../common/type").HealthEvent } HealthEvent
 * @typedef { import("../common/type").PingEvent } PingEvent
 * @typedef { import("../common/type").PongEvent } PongEvent
 * @typedef { import("../common/vector").Point2 } Point2
 * @typedef { import("../common/car").Car } Car
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const {
  SCOREBOARD_LENGTH, WORLD_WIDTH, WORLD_HEIGHT, PICKUP_TYPE, ROCK_TYPE,
} = require('../common/config');
const { randomPoint } = require('../common/util');
const { ServerSimulation } = require('./simulation');

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { serveClient: false });

const sim = new ServerSimulation();
sim.start(Date.now(), 0);

let nextId = 0;
const entities = [];
for (let i = 0; i < 1000; i += 1) {
//   entities.push({
//     type: TREE_TYPE,
//     point: randomPoint(),
//     id: nextId++,
//   });
  entities.push({
    type: ROCK_TYPE,
    point: randomPoint(),
    id: nextId++,
  });
}
for (let i = 0; i < 10000; i += 1) {
  entities.push({
    type: PICKUP_TYPE,
    point: randomPoint(),
    id: nextId++,
  });
}
entities.forEach((entity) => sim.quadtree.insert(entity.type, entity.point, entity.id));

sim.on('delete-entity', (/** @type {number} */ id) => {
  const index = entities.findIndex((entity) => entity.id === id);
  entities.splice(index, 1);
  ioServer.emit('delete-entity', id);
});

const createScoreboard = () => {
  /** @type {Scoreboard} */
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

  console.info(`New client connected ${id}`);

  socket.emit('start', {
    startSimTime: sim.startSimTime,
    currentSimStep: sim.simStep,
  });

  sim.cars.forEach((car) => socket.emit('update-car', car.serialize()));
  const syncInterval = setInterval(() => {
    // todo: only cars near this car
    // todo: delete cars far away
    sim.cars.forEach((car) => socket.emit('update-car', car.serialize()));
  }, 5000);

  // todo: only entities around car
  socket.emit('entities', entities);

  // send the initial scoreboard
  socket.emit('scoreboard', createScoreboard());

  socket.on('ping', (/** @type {PingEvent} */ pingEvent) => {
    /** @type {PongEvent} */
    const pongEvent = { ...pingEvent, pongTime: Date.now() };
    socket.emit('pong', pongEvent);
  });

  /** @type {Car} */
  let socketCar;

  socket.on('join', (/** @type {JoinEvent} */ event) => {
    console.info(`Client joining ${event.username}`);
    socketCar = sim.addCar(id, event.username, event.color);

    socketCar.on('collide', () => {
      if (socketCar) {
        socketCar.health -= 10;
      }

      // todo: delete this
      // // if the car died it will no longer exist
      // if (socketCar) {
      //   // collisions often make the car go out of sync so send a sync update
      //   ioServer.emit('update-car', socketCar.serialize());
      // }
    });

    socketCar.on('health', () => {
      if (socketCar) {
        /** @type {HealthEvent} */
        const healthEvent = { id, health: socketCar.health };
        ioServer.emit('health', healthEvent);
      }
    });

    socketCar.on('score', () => {
      /** @type {ScoreEvent} */
      const scoreEvent = { id, score: socketCar.score };
      ioServer.emit('score', scoreEvent);

      ioServer.emit('scoreboard', createScoreboard());
    });

    if (process.env.NODE_ENV === 'production') {
      socketCar.position = {
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
      };
    } else {
      socketCar.position = {
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
      };
    }

    // send an updated scoreboard including the new car
    ioServer.emit('scoreboard', createScoreboard());

    ioServer.emit('update-car', socketCar.serialize());
  });

  const deleteCarListener = (deletedCarId) => {
    if (socketCar && id === deletedCarId) {
      socketCar = undefined;
    }
    socket.emit('delete', deletedCarId);
  };
  sim.on('delete-car', deleteCarListener);

  // health regen
  const healthRegenInterval = setInterval(() => {
    if (socketCar && socketCar.health < 100) {
      socketCar.health = Math.min(socketCar.health + 5, 100);
    }
  }, 5000);

  socket.on('input', (/** @type {InputEvent} */ event) => {
    if (socketCar) {
      socketCar.processInput(event, sim.simStep);

      // send the input to everyone except the sender because they have already processed it
      socket.broadcast.emit('input', event);
    }
  });

  socket.on('disconnect', () => {
    console.info(`Client disconnected ${id}`);

    if (socketCar) {
      sim.deleteCar(id);
    }

    if (syncInterval) {
      clearInterval(syncInterval);
    }

    if (healthRegenInterval) {
      clearInterval(healthRegenInterval);
    }

    sim.off('delete-car', deleteCarListener);
  });
});

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.info(`Listening at ${port}`));
