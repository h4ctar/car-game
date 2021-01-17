const io = require('socket.io-client');
const PIXI = require('pixi.js');
const { Car } = require('../car');
const util = require('../util');

const myId = util.uuid();
console.info(`id ${myId}`);

PIXI.Loader.shared
  .add('car.png')
  .load(() => {
    const socket = io.connect({ query: `id=${myId}` });
    socket.on('connect', () => console.log('Socket connected'));

    const canvas = document.getElementById('canvas');
    const app = new PIXI.Application({ view: canvas, autoResize: true });
    app.renderer.resize(window.innerWidth, window.innerHeight);

    const keys = new Array(256).fill(false);
    window.onkeydown = (event) => { keys[event.which] = true; };
    window.onkeyup = (event) => { keys[event.which] = false; };

    const SIM_PERIOD = 16;
    let simRunning;
    let simStep;
    let simStartStep;
    let simStartTime;
    socket.on('start', (event) => {
      console.info(`start ${event}`);
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
        cars[index].remove(app);
        cars.splice(index);
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

    const draw = () => {
      cars.forEach((car) => car.draw(app));
    };

    // simulation loop with fixed step
    const loop = () => {
      if (simRunning) {
        const desiredSimStep = simStartStep + (Date.now() - simStartTime) / SIM_PERIOD;
        // todo: kill if too many steps required
        while (simStep < desiredSimStep) {
          update();
          simStep += 1;
        }
        draw();
        checkInput();
      }
    };
    setInterval(loop, SIM_PERIOD);

    const debugText = new PIXI.Text('', {
      fontFamily: 'Arial', fontSize: 24, fill: 0xff1010, align: 'center',
    });
    app.stage.addChild(debugText);

    let pingTime;
    setInterval(() => {
      pingTime = Date.now();
      socket.emit('ping');
    }, 1000);
    socket.on('pong', () => {
      const latency = Date.now() - pingTime;
      debugText.text = `Step: ${simStep}, Latency: ${latency}`;
    });
  });
