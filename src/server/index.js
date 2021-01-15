const express = require('express');
const http = require('http');
const { Car } = require('../car');
const io = require("socket.io");

const app = express();
const httpServer = http.createServer(app);
const ioServer = io(httpServer);

const simPeriod = 16;
const simStartTime = Date.now();
let simStep = 0;

const cars = [];

ioServer.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('ping', () => socket.emit('pong'));

  const id = socket.request._query.id;

  const car = new Car(id);
  car.position = [200, 200];
  cars.push(car);

  // send this car to everyone else
  ioServer.emit('update', car);

  // send all cars to the new client
  cars.forEach((car) => socket.emit('update', car));

  // tell them to start the simulation at the current simulation step
  socket.emit('start', simStep);

  socket.on('input', (event) => {
    car.input(event, simStep);

    // send the input to everyone except the sender
    socket.broadcast.emit('input', event);
  });

  socket.on('disconnect', () => {
    const index = cars.indexOf(car);
    if (index !== -1) {
      cars.splice(index);
    }
    ioServer.emit('delete', id);
  });
});

const loop = () => {
  const desiredSimStep = (Date.now() - simStartTime) / simPeriod;
  while (simStep < desiredSimStep) {
    cars.forEach((car) => car.update());
    simStep += 1;
  }
};
setInterval(loop, simPeriod);

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));
