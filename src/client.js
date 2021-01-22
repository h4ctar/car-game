const io = require('socket.io-client');
const { Car } = require('./car');
const util = require('./util');

const myId = util.uuid();
console.info(`id ${myId}`);

/** @type { HTMLCanvasElement } */
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
setInterval(() => {
  pingTime = Date.now();
  socket.emit('ping');
}, 10000);
socket.on('pong', () => console.info(`latency: ${Date.now() - pingTime}`));

document.getElementById('start-form').addEventListener('submit', (event) => {
  console.info('Starting');
  /** @type { HTMLInputElement} */
  const usernameInput = document.getElementById('username-input');
  const username = usernameInput.value;
  socket.emit('start', { username });
  event.preventDefault();
});

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

    car = new Car(event.id, event.username);
    cars.push(car);

    if (car.id === myId) {
      myCar = car;
      document.getElementById('start-card').style.display = 'none';
      document.getElementById('info-card').style.display = 'block';
    }
  }

  car.deserialize(event, simStep);

  if (car.id === myId) {
    document.getElementById('score-span').textContent = car.score;
    document.getElementById('health-span').textContent = car.health;
  }
});

socket.on('delete', (id) => {
  console.info(`Delete car ${id}`);

  const index = cars.findIndex((car) => car.id === id);
  if (index !== -1) {
    cars.splice(index, 1);
  }

  if (id === myCar?.id) {
    myCar = undefined;
    document.getElementById('start-card').style.display = 'block';
    document.getElementById('info-card').style.display = 'none';
  }
});

socket.on('input', (event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.processInput(event, simStep);
  }
});

const checkInput = () => {
  if (myCar) {
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

    if (keys[32] !== myCar.shoot) {
      event.shoot = keys[32];
      dirty = true;
    }

    if (dirty) {
      myCar.processInput(event, simStep);
      socket.emit('input', event);
    }
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
  if (simRunning) {
    const camera = myCar ? myCar.position : [0, 0];
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const GRID_SIZE = 200;
    context.beginPath();
    context.strokeStyle = 'grey';
    for (let x = -(camera[0] / 2 % GRID_SIZE); x < canvas.width; x += GRID_SIZE) {
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
    }
    for (let y = camera[1] / 2 % GRID_SIZE; y < canvas.height; y += GRID_SIZE) {
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
    }
    context.stroke();

    context.save();
    context.translate(canvas.width / 2, canvas.height - canvas.height / 2);
    context.scale(0.5, -0.5);

    context.translate(-camera[0], -camera[1]);

    cars.forEach((car) => car.draw(context));
    context.restore();
  }

  window.requestAnimationFrame(draw);
};
draw();
