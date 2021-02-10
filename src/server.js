/**
 * @typedef { import("./type").JoinEvent } JoinEvent
 * @typedef { import("./type").InputEvent } InputEvent
 * @typedef { import("./type").ScoreboardEvent } ScoreboardEvent
 * @typedef { import("./type").ScoreEvent } ScoreEvent
 * @typedef { import("./type").HealthEvent } HealthEvent
 * @typedef { import("./vector").Point2 } Point2
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Car } = require('./car');
const { SIM_PERIOD, SCOREBOARD_LENGTH } = require('./config');
const { Simulation } = require('./simulation');
const { deserializeInputEvent } = require('./type');
const { sub, length } = require('./vector');

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { serveClient: false });

const sim = new Simulation();

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
  console.log('New client connected');

  // eslint-disable-next-line no-underscore-dangle
  const id = socket.request._query.id;

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
  socket.emit('trees', sim.trees);

  // send the initial scoreboard
  socket.emit('scoreboard', createScoreboard());

  /** @type {Car} */
  let car;

  socket.on('join', (/** @type {JoinEvent} */ event) => {
    console.info(`Client joining ${event.username}`);
    car = new Car(id, event.username, event.color);
    car.position = { x: 200, y: 200 };
    sim.cars.push(car);

    // send an updated scoreboard including the new car
    ioServer.emit('scoreboard', createScoreboard());

    ioServer.emit('update', car.serialize());
  });

  socket.on('input', (/** @type {ArrayBuffer} */ buffer) => {
    if (car) {
      const event = deserializeInputEvent(buffer);
      car.processInput(event, sim.simStep);

      // send the input to everyone except the sender because they have already processed it
      socket.broadcast.emit('input', buffer);
    }
  });

  socket.on('disconnect', () => {
    if (car) {
      sim.deleteCar(car);
      // todo: this could be event listener on the simulation
      ioServer.emit('delete', car.id);
      ioServer.emit('scoreboard', createScoreboard());
    }
  });
});

const update = () => {
  sim.cars.forEach((car) => car.update(sim.simStep));
};

const loop = () => {
  const desiredSimStep = Math.floor((Date.now() - sim.simStartTime) / SIM_PERIOD);
  if (desiredSimStep - sim.simStep > 100) {
    throw new Error('Too many simulation steps missed');
  }

  while (sim.simStep < desiredSimStep) {
    update();

    // check if bullet hits car
    [...sim.cars].forEach((thisCar) => {
      const otherCars = sim.cars.filter((car) => car !== thisCar);

      thisCar.bullets.forEach((bullet) => otherCars.forEach((otherCar) => {
        const distance = length(sub(bullet.position, otherCar.position));
        if (distance < 30) {
          thisCar.score += 10;

          ioServer.emit('scoreboard', createScoreboard());

          otherCar.health -= 10;
          if (otherCar.health > 0) {
            /** @type {HealthEvent} */
            const healthEvent = { id: otherCar.id, health: otherCar.health };
            ioServer.emit('health', healthEvent);
          } else {
            thisCar.score += 100;
            sim.deleteCar(otherCar);
            ioServer.emit('delete', otherCar.id);
            ioServer.emit('scoreboard', createScoreboard());
          }

          /** @type {ScoreEvent} */
          const scoreEvent = { id: thisCar.id, score: thisCar.score };
          ioServer.emit('score', scoreEvent);
        }
      }));
    });

    sim.simStep += 1;
  }
};
setInterval(loop, SIM_PERIOD);

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
