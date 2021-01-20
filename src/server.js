const express = require('express');
const http = require('http');
const io = require('socket.io');
const math = require('mathjs');
const { Car } = require('./car');
const { SIM_PERIOD } = require('./config');

const app = express();
const httpServer = http.createServer(app);
const ioServer = io(httpServer, { serveClient: false });

const simStartTime = Date.now();
let simStep = 0;

const cars = [];

const deleteCar = (car) => {
  const index = cars.indexOf(car);
  if (index !== -1) {
    cars.splice(index, 1);
  }
  ioServer.emit('delete', car.id);
};

ioServer.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('ping', () => socket.emit('pong'));

  // eslint-disable-next-line no-underscore-dangle
  const id = socket.request._query.id;
  let car;

  // send all cars to the new client
  cars.forEach((c) => socket.emit('update', c.serialize()));

  // tell them to start the simulation at the current simulation step
  socket.emit('start', simStep);

  socket.on('start', (event) => {
    console.info(`Client starting ${event.username}`);
    car = new Car(id, event.username);
    car.position = [200, 200];
    cars.push(car);

    ioServer.emit('update', car.serialize());
  });

  socket.on('input', (event) => {
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
        const distance = math.subtract(bullet.position, otherCar.position);
        // todo: better collision
        if (Math.abs(distance[0]) < 20 && Math.abs(distance[1]) < 20) {
          thisCar.score += 10;
          ioServer.emit('update', thisCar.serialize());

          otherCar.health -= 10;
          if (otherCar.health > 0) {
            ioServer.emit('update', otherCar.serialize());
          } else {
            deleteCar(otherCar);
          }
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
