import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import Car from './car.js';

const app = express();
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, { serveClient: false });

const cars = [];

ioServer.on('connection', (socket) => {
  console.log('New client connected');

  const car = new Car([200, 200]);
  cars.length = 0;
  cars.push(car);

  socket.on('input', (event) => {
    console.log(event);
    car.steerDirection = event.steerDirection;
    car.accelerate = event.accelerate;
    car.brake = event.brake;
  });

  // socket.on('disconnect', () => {});
});

app.use(express.static('client/dist'));

const port = 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));

const simPeriod = 20;

const loop = () => {
  cars.forEach((car) => car.update(simPeriod / 1000));
  ioServer.emit('update', cars);
};

setInterval(loop, simPeriod);
