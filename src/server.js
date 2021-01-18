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

ioServer.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('ping', () => socket.emit('pong'));

  // eslint-disable-next-line no-underscore-dangle
  const id = socket.request._query.id;

  const car = new Car(id);
  car.position = [200, 200];
  cars.push(car);

  // send this car to everyone else
  socket.broadcast.emit('update', car.serialize());

  // send all cars to the new client
  cars.forEach((c) => socket.emit('update', c.serialize()));

  // tell them to start the simulation at the current simulation step
  socket.emit('start', simStep);

  socket.on('input', (event) => {
    car.processInput(event, simStep);

    // send the input to everyone except the sender
    socket.broadcast.emit('input', event);
  });

  socket.on('disconnect', () => {
    const index = cars.indexOf(car);
    if (index !== -1) {
      cars.splice(index, 1);
    }
    ioServer.emit('delete', id);
  });
});

const loop = () => {
  const desiredSimStep = Math.floor((Date.now() - simStartTime) / SIM_PERIOD);
  if (desiredSimStep - simStep > 100) {
    throw new Error('Too many simulation steps missed');
  }

  while (simStep < desiredSimStep) {
    // eslint-disable-next-line no-loop-func
    cars.forEach((car) => car.update(simStep));

    // check if bullet hits car
    const bullets = cars.flatMap((car) => car.bullets);
    bullets.forEach((bullet) => cars.forEach((car) => {
      const distance = math.subtract(bullet.position, car.position);
      if (Math.abs(distance[0]) < 10 && Math.abs(distance[1]) < 10) {
        car.reset();
        ioServer.emit('update', car.serialize());
      }
    }));

    simStep += 1;
  }
};
setInterval(loop, SIM_PERIOD);

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
