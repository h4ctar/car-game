const io = require('socket.io-client');
const { Car } = require('../car');
const util = require('../util');

const myId = util.uuid();
console.info(`id ${myId}`);

const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const context = canvas.getContext('2d');

const socket = io.connect({ query: `id=${myId}` });
socket.on('disconnect', () => {
  console.error('Socked disconnected');
  socket.close();
});

let pingTime;
let latency;
setInterval(() => {
  pingTime = Date.now();
  socket.emit('ping');
}, 1000);
socket.on('pong', () => { latency = Date.now() - pingTime; });

const keys = new Array(256).fill(false);
window.onkeydown = (event) => { keys[event.which] = true; };
window.onkeyup = (event) => { keys[event.which] = false; };

const SIM_PERIOD = 16;
let simRunning;
let simStep;
let simStartStep;
let simStartTime;
socket.on('start', (event) => {
  console.info(`Start simulation ${event}`);

  simRunning = true;
  simStep = event;
  simStartStep = event;
  simStartTime = Date.now();
});

const cars = [];

let myCar;

socket.on('update', (event) => {
  let car = cars.find((c) => c.id === event.id);
  if (!car) {
    console.log('New car', event.id);

    car = new Car(event.id);
    cars.push(car);

    if (car.id === myId) {
      myCar = car;
    }
  }

  car.position = event.position;
  car.angle = event.angle;
  car.velocity = event.velocity;
  car.angularVelocity = event.angularVelocity;
  car.steerDirection = event.steerDirection;
  car.accelerate = event.accelerate;
  car.brake = event.brake;
  car.wheels = event.wheels;
  car.histories = event.histories;
});

socket.on('delete', (id) => {
  console.info(`Delete car ${id}`);

  const index = cars.findIndex((car) => car.id === id);
  if (index !== -1) {
    cars.splice(index, 1);
  }
});

socket.on('input', (event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.processInput(event, simStep);
  }
});

const checkInput = () => {
  let dirty = false;
  const event = {
    id: myId,
    simStep,
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
    myCar.processInput(event, simStep);
    socket.emit('input', event);
  }
};

const update = () => {
  cars.forEach((car) => car.update(simStep));
};

// simulation loop with fixed step
const loop = () => {
  if (simRunning) {
    const desiredSimStep = Math.floor(simStartStep + (Date.now() - simStartTime) / SIM_PERIOD);
    if (desiredSimStep - simStep > 100) {
      console.error('Missed too many simulation steps');
      simRunning = false;
      socket.close();
    }

    // todo: kill if too many steps required
    while (simStep < desiredSimStep) {
      update();
      simStep += 1;
    }
    checkInput();
  }
};
setInterval(loop, SIM_PERIOD);

// draw on animation frame
const draw = () => {
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.save();
  context.translate(canvas.width / 2, canvas.height - canvas.height / 2);
  context.scale(0.5, -0.5);

  context.translate(-myCar.position[0], -myCar.position[1]);

  // todo: make this good
  context.beginPath();
  context.strokeStyle = 'grey';
  for (let i = 0; i < 50; i += 1) {
    context.moveTo(0, i * 400);
    context.lineTo(49 * 400, i * 400);
    context.moveTo(i * 400, 0);
    context.lineTo(i * 400, 49 * 400);
  }
  context.stroke();

  cars.forEach((car) => car.draw(context));
  context.restore();

  context.fillStyle = 'white';
  context.fillText(`Step: ${simStep}, Latency: ${latency}`, 10, 15);

  window.requestAnimationFrame(draw);
};
draw();
