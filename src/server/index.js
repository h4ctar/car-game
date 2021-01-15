const express = require('express')
const http = require('http');
const { Car } = require('../car')

const app = express();
const httpServer = http.createServer(app);
const ioServer = require("socket.io")(httpServer, { pingInterval: 5000 });

let simStep = 0;

const cars = [];

ioServer.on('connection', (socket) => {
  console.log('New client connected');

  const id = socket.request._query.id;

  const car = new Car(id);
  car.position = [200, 200];
  cars.push(car);
  ioServer.emit('update', car);

  socket.emit('start', simStep);
  cars.forEach((c) => socket.emit('update', c));

  socket.on('input', (event) => {
    car.input(event, simStep);
    ioServer.emit('update', car);
  });

  socket.on('disconnect', () => {
    const index = cars.indexOf(car);
    if (index !== -1) {
      cars.splice(index);
    }
    ioServer.emit('delete', id);
  });
});

app.use(express.static('static'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));

const loop = () => {
  cars.forEach((car) => car.update());
  simStep += 1;
};

const simPeriod = 16;
setInterval(loop, simPeriod);
