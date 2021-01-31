/**
 * @typedef { import('./type').InputEvent } InputEvent
 * @typedef { import('./type').ScoreboardEvent } ScoreboardEvent
 * @typedef { import('./type').ScoreEvent } ScoreEvent
 * @typedef { import('./type').HealthEvent } HealthEvent
 * @typedef { import('./type').UpdateEvent } UpdateEvent
 * @typedef { import('./type').JoinEvent } JoinEvent
 * @typedef { import('./vector').Point2 } Point2
 */

const { Toast } = require('bootstrap');
const { io } = require('socket.io-client');
const { Car } = require('./car');
const util = require('./util');
const { rotate, sub, add } = require('./vector');

const myId = util.uuid();
console.info(`id ${myId}`);

const canvas = /** @type { HTMLCanvasElement } */ (document.getElementById('canvas'));
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const context = canvas.getContext('2d');

const startCard = document.getElementById('start-card');
const startForm = document.getElementById('start-form');
const startButton = /** @type { HTMLInputElement} */ (Array.from(document.getElementsByTagName('button')).find((element) => element.textContent === 'Start'));
const usernameInput = /** @type { HTMLInputElement} */ (document.getElementById('username-input'));
const infoCard = document.getElementById('info-card');
const scoreSpan = /** @type { HTMLSpanElement } */ (document.getElementById('score-span'));
const healthSpan = /** @type { HTMLSpanElement } */ (document.getElementById('health-span'));
const scoreboardTableBody = /** @type { HTMLTableSectionElement } */ (document.getElementById('scoreboard-tbody'));
for (let i = 1; i <= 5; i += 1) {
  const row = scoreboardTableBody.insertRow();
  row.insertCell().textContent = String(i);
  row.insertCell();
  row.insertCell();
}
const disconnectedToast = new Toast(document.getElementById('disconnected-toast'));

const socket = io({ query: `id=${myId}` });
socket.on('disconnect', () => {
  console.error('Socked disconnected');
  socket.close();
  disconnectedToast.show();
});

let pingTime;
setInterval(() => {
  pingTime = Date.now();
  socket.emit('ping');
}, 10000);
socket.on('pong', () => console.info(`latency: ${Date.now() - pingTime}`));

startButton.disabled = !usernameInput.value;
usernameInput.addEventListener('input', () => { startButton.disabled = !usernameInput.value; });

startForm.addEventListener('submit', (event) => {
  console.info('Starting');

  const colors = ['#0d6efd', '#198754', '#dc3545', '#ffc107', '#0dcaf0'];

  let color;
  for (let i = 0; i < 5; i += 1) {
    const input = /** @type { HTMLInputElement} */ (document.getElementById(`color-${i + 1}-input`));
    if (input.checked) {
      color = colors[i];
    }
  }

  /** @type {JoinEvent} */
  const joinEvent = {
    username: usernameInput.value,
    color,
  };
  socket.emit('join', joinEvent);
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

/** @type { Car[] } */
const cars = [];
/** @type { Car } */
let myCar;

socket.on('update', (/** @type {UpdateEvent} */ event) => {
  console.log('Received update');
  let car = cars.find((c) => c.id === event.id);
  if (!car) {
    console.log('New car', event.id);

    car = new Car(event.id, event.username, event.color);
    cars.push(car);

    if (car.id === myId) {
      myCar = car;
      startCard.style.display = 'none';
      infoCard.style.display = 'block';
      scoreSpan.textContent = String(myCar.score);
      healthSpan.textContent = String(myCar.score);
    }
  }

  car.deserialize(event, simStep);
});

socket.on('delete', (/** @type {string} */ id) => {
  console.info(`Delete car ${id}`);

  const index = cars.findIndex((car) => car.id === id);
  if (index !== -1) {
    cars.splice(index, 1);
  }

  if (id === myCar?.id) {
    myCar = undefined;
    startCard.style.display = 'block';
    infoCard.style.display = 'none';
  }
});

socket.on('input', (event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.processInput(event, simStep);
  }
});

socket.on('score', (/** @type {ScoreEvent} */ event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.score = event.score;

    if (car.id === myId) {
      scoreSpan.textContent = String(car.score);
    }
  }
});

socket.on('health', (/** @type {HealthEvent} */ event) => {
  const car = cars.find((c) => c.id === event.id);
  if (car) {
    car.health = event.health;

    if (car.id === myId) {
      healthSpan.textContent = String(car.health);
    }
  }
});

socket.on('scoreboard', (/** @type {ScoreboardEvent} */ scoreboard) => {
  scoreboard.forEach((entry, index) => {
    const row = scoreboardTableBody.rows[index];
    row.cells[1].textContent = entry.username;
    row.cells[2].textContent = String(entry.score);
  });
  // todo: hide remaining rows
});

const checkInput = () => {
  if (myCar) {
    let dirty = false;

    /** @type {InputEvent} */
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

/**
 * @param {Point2} camera
 */
const drawMap = (camera) => {
  const GRID_SIZE = 200;
  context.beginPath();
  context.strokeStyle = 'grey';
  for (let x = -(camera.x % GRID_SIZE); x < canvas.width; x += GRID_SIZE) {
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
  }
  for (let y = camera.y % GRID_SIZE; y < canvas.height; y += GRID_SIZE) {
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
  }
  context.stroke();
};

const drawRadar = () => {
  if (myCar) {
    const radarRadius = 100;
    cars
      .filter((car) => car !== myCar)
      .forEach((car) => {
        const v = sub(car.position, myCar.position);
        const angle = Math.atan2(-v.y, v.x);
        const blipPosition = add(rotate({ x: radarRadius, y: 0 }, angle), { x: canvas.width / 2, y: canvas.height / 2 });

        context.fillStyle = car.color;
        context.fillRect(blipPosition.x, blipPosition.y, 4, 4);
      });
  }
};

const draw = () => {
  if (simRunning) {
    const camera = myCar ? myCar.position : { x: 0, y: 0 };

    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMap(camera);

    context.save();
    context.translate(canvas.width / 2, canvas.height - canvas.height / 2);
    context.scale(1, -1);

    context.translate(-camera.x, -camera.y);

    cars.forEach((car) => car.draw(context));
    context.restore();

    drawRadar();
  }

  window.requestAnimationFrame(draw);
};
draw();

// register the service worker
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator
      .serviceWorker
      .register('service-worker.js');
  }
});
