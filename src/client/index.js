const io = require('socket.io-client');
const { Car } = require('../car');

const myId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});

const socket = io.connect({ query: `id=${myId}` });
socket.on('connect', () => console.log('Socket connected'));

let pingTime;
let latency;
setInterval(() => {
  pingTime = Date.now();
  socket.emit('ping');
}, 1000);
socket.on('pong', () => latency = Date.now() - pingTime);

const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const context = canvas.getContext('2d');

const keys = new Array(256);
window.onkeydown = (event) => { keys[event.which] = true; };
window.onkeyup = (event) => { keys[event.which] = false; };

const simPeriod = 16;
let simRunning;
let simStep;
let simStartStep;
let simStartTime;
socket.on('start', (event) => {
  simRunning = true;
  simStep = event;
  simStartStep = event;
  simStartTime = Date.now();
});

const cars = [];

const myCar = new Car(myId);
cars.push(myCar);

socket.on('update', (event) => {
  let car = cars.find((car) => car.id === event.id);
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

socket.on('input', (event) => {
  const car = cars.find((car) => car.id === event.id);
  if (car) {
    car.input(event);
  }
});

const input = () => {
  let dirty = false;
  let event = {
    id: myId,
    simStep
  };

  let steerDirection = 0;
  if (keys[65]) {
    steerDirection = 1;
  } else if (keys[68]) {
    steerDirection = -1;
  }

  if (steerDirection !== myCar.steerDirection) {
    event.steerDirection = steerDirection;
    dirty = true;
  }

  if (keys[87] !== myCar.accelerate) {
    event.accelerate = keys[87];
    dirty = true;
  }

  if (keys[83] !== myCar.brake) {
    event.brake = keys[83];
    dirty = true;
  }

  if (dirty) {
    myCar.input(event, simStep);
    socket.emit('input', event);
  }
};

const update = () => {
  cars.forEach((car) => car.update());
};

const loop = () => {
  if (simRunning) {
    const desiredSimStep = simStartStep + (Date.now() - simStartTime) / simPeriod;
    while (simStep < desiredSimStep) {
      input();
      update();
      simStep += 1;
    }
  }
};
setInterval(loop, simPeriod);

const draw = () => {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.translate(0, canvas.height);
  context.scale(1, -1);
  cars.forEach((car) => car.draw(context));
  context.restore();

  context.fillStyle = 'white';
  context.fillText(`Step: ${simStep}, Latency: ${latency}`, 10, 15);

  window.requestAnimationFrame(draw);
};
draw();
