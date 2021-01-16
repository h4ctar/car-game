const express = require('express');
const http = require('http');
const io = require('socket.io');
const { Car } = require('../car');

const app = express();
const httpServer = http.createServer(app);
const ioServer = io(httpServer, { serveClient: false });

const SIM_PERIOD = 16;
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
  socket.broadcast.emit('update', car);

  // send all cars to the new client
  cars.forEach((c) => socket.emit('update', {
    id: c.id,
    position: c.position,
    angle: c.angle,
    velocity: c.velocity,
    angularVelocity: c.angularVelocity,
    steerDirection: c.steerDirection,
    accelerate: c.accelerate,
    brake: c.brake,
    wheels: c.wheels,
    histories: c.histories,
  }));

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
  const desiredSimStep = (Date.now() - simStartTime) / SIM_PERIOD;
  while (simStep < desiredSimStep) {
    // eslint-disable-next-line no-loop-func
    cars.forEach((car) => car.update(simStep));
    simStep += 1;
  }
};
setInterval(loop, SIM_PERIOD);

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
