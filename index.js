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

  const id = socket.request._query.id;

  const car = new Car(id);
  car.position = [200, 200];
  cars.push(car);
  ioServer.emit('update', car);

  cars.forEach((c) => socket.emit('update', c));

  socket.on('input', (event) => {
    console.log(event);
    car.steerDirection = event.steerDirection;
    car.accelerate = event.accelerate;
    car.brake = event.brake;
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

app.use(express.static('client/dist'));

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log(`Listening at ${port}`));

const simPeriod = 16;

const loop = () => {
  cars.forEach((car) => car.update(simPeriod / 1000));
};

setInterval(loop, simPeriod);
