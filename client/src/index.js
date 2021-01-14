import { io } from 'socket.io-client';
import Car from './car';

const myId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

const socket = io.connect({ query: `id=${myId}` });
socket.on('connect', () => console.log('Socket connected'));

const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const context = canvas.getContext('2d');
context.translate(0, canvas.height);
context.scale(1, -1);

const keys = new Array(256);
window.onkeydown = (event) => { keys[event.which] = true; };
window.onkeyup = (event) => { keys[event.which] = false; };

const cars = [];

const myCar = new Car(myId);
cars.push(myCar);

socket.on('update', (event) => {
  let car = cars.find((c) => c.id === event.id);
  if (!car) {
    car = new Car(event.id);
    cars.push(car);
  }
  for (var k in event) {
    car[k] = event[k];
  }
});

socket.on('delete', (id) => {
  const index = cars.findIndex((car) => car.id === id);
  if (index !== -1) {
    cars.splice(index);
  }
});

const input = () => {
  let dirty = false;

  let steerDirection = 0;
  if (keys[65]) {
    steerDirection = 1;
  } else if (keys[68]) {
    steerDirection = -1;
  }

  if (steerDirection !== myCar.steerDirection) {
    myCar.steerDirection = steerDirection;
    dirty = true;
  }

  if (keys[87] !== myCar.accelerate) {
    myCar.accelerate = keys[87];
    dirty = true;
  }

  if (keys[83] !== myCar.brake) {
    myCar.brake = keys[83];
    dirty = true;
  }

  if (dirty) {
    socket.emit('input', { steerDirection: myCar.steerDirection, accelerate: myCar.accelerate, brake: myCar.brake });
  }
};

const update = (dt) => {
  cars.forEach((car) => car.update(dt));
};

const simPeriod = 16;

const loop = () => {
  input();
  update(simPeriod / 1000);
};

setInterval(loop, simPeriod);

const draw = () => {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);

  cars.forEach((car) => car.draw(context));

  window.requestAnimationFrame(draw);
};

draw();
