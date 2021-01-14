import { io } from 'socket.io-client';
import Car from './car';

const socket = io.connect('http://localhost:3000');
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

const car = new Car([200, 200]);
socket.on('update', (event) => {
  for (var k in event[0]) {
    car[k] = event[0][k];
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

  if (steerDirection !== car.steerDirection) {
    car.steerDirection = steerDirection;
    dirty = true;
  }

  if (keys[87] !== car.accelerate) {
    car.accelerate = keys[87];
    dirty = true;
  }

  if (keys[83] !== car.brake) {
    car.brake = keys[83];
    dirty = true;
  }

  if (dirty) {
    socket.emit('input', { steerDirection: car.steerDirection, accelerate: car.accelerate, brake: car.brake });
  }
};

const update = (dt) => {
  car.update(dt);
};

const simPeriod = 20;

const loop = () => {
  input();
  update(simPeriod / 1000);
};

setInterval(loop, simPeriod);

const draw = () => {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);

  car.draw(context);

  window.requestAnimationFrame(draw);
};

draw();
