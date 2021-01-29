/**
 * @typedef { import("./type").JoinEvent } JoinEvent
 * @typedef { import("./type").InputEvent } InputEvent
 * @typedef { import("./type").ScoreboardEvent } ScoreboardEvent
 * @typedef { import("./type").ScoreEvent } ScoreEvent
 * @typedef { import("./type").HealthEvent } HealthEvent
 */
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Car } = require('./car');
const { SIM_PERIOD } = require('./config');
const { sub, length } = require('./vector');

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { serveClient: false });

const simStartTime = Date.now();
let simStep = 0;

/** @type {Car[]} */
const cars = [];

/**
 * @type {() => ScoreboardEvent}
 */
const createScoreboard = () => {
  const scoreboard = cars
    .map((car) => ({ username: car.username, score: car.score }))
    .sort((a, b) => b.score - a.score);
  scoreboard.length = 5;
  scoreboard.fill({ username: '', score: 0 }, cars.length, 5);
  return scoreboard;
};

/**
 * Delete a car.
 * @param {Car} car the car to delete
 */
const deleteCar = (car) => {
  const index = cars.indexOf(car);
  if (index !== -1) {
    cars.splice(index, 1);
  }
  ioServer.emit('delete', car.id);

  // send an updated scoreboard without the deleted
  ioServer.emit('scoreboard', createScoreboard());
};

ioServer.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('ping', () => socket.emit('pong'));

  // eslint-disable-next-line no-underscore-dangle
  const id = socket.request._query.id;

  /** @type {Car} */
  let car;

  // send all cars to the new client
  cars.forEach((c) => socket.emit('update', c.serialize()));

  // tell them to start the simulation at the current simulation step
  socket.emit('start', simStep);

  // send the initial scoreboard
  socket.emit('scoreboard', createScoreboard());

  socket.on('join', (/** @type {JoinEvent} */ event) => {
    console.info(`Client joining ${event.username}`);
    car = new Car(id, event.username);
    car.position = { x: 200, y: 200 };
    cars.push(car);

    // send an updated scoreboard including the new car
    ioServer.emit('scoreboard', createScoreboard());

    ioServer.emit('update', car.serialize());
  });

  socket.on('input', (/** @type {InputEvent} */ event) => {
    if (car) {
      car.processInput(event, simStep);

      // send the input to everyone except the sender because they have already processed it
      socket.broadcast.emit('input', event);
    }
  });

  socket.on('disconnect', () => {
    if (car) {
      deleteCar(car);
    }
  });
});

const update = () => {
  cars.forEach((car) => car.update(simStep));
};

const loop = () => {
  const desiredSimStep = Math.floor((Date.now() - simStartTime) / SIM_PERIOD);
  if (desiredSimStep - simStep > 100) {
    throw new Error('Too many simulation steps missed');
  }

  while (simStep < desiredSimStep) {
    update();

    // check if bullet hits car
    [...cars].forEach((thisCar) => {
      const otherCars = cars.filter((car) => car !== thisCar);
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
            deleteCar(otherCar);
          }

          /** @type {ScoreEvent} */
          const scoreEvent = { id: thisCar.id, score: thisCar.score };
          ioServer.emit('score', scoreEvent);
        }
      }));
    });

    simStep += 1;
  }
};
setInterval(loop, SIM_PERIOD);

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
