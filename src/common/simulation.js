/**
 * @typedef { import("./vector").Point2 } Point2
 * @typedef {import("./vector").Box} Box
 */

const { EventEmitter } = require('events');
const { Quadtree } = require('./quadtree');
const { Car } = require('./car');
const {
  SIM_PERIOD, WORLD_WIDTH, WORLD_HEIGHT,
} = require('./config');

exports.Simulation = class Simulation extends EventEmitter {
  constructor() {
    super();

    this.simRunning = false;

    this.timeSkew = 0;

    this.quadtree = new Quadtree({
      x: 0,
      y: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    });

    /** @type {Car[]} */
    this.cars = [];
  }

  /**
   * Get a car by ID.
   * @param {string} id
   */
  getCar(id) {
    return this.cars.find((car) => car.id === id);
  }

  /**
   * Add a new car.
   * @param {string} id
   * @param {string} username
   * @param {string} color
   */
  addCar(id, username, color) {
    const car = new Car(id, username, color, this.quadtree);
    this.cars.push(car);
    return car;
  }

  /**
   * Delete a car.
   * @param {string} id
   */
  deleteCar(id) {
    console.info(`Deleting car ${id}`);
    const index = this.cars.findIndex((car) => car.id === id);
    if (index !== -1) {
      this.cars.splice(index, 1);
      this.emit('delete-car', id);
    }
  }

  /**
   * @param {number} startSimStep
   * @param {number} simStartTime
   */
  start(startSimStep, simStartTime) {
    console.log(`Start simulation ${startSimStep}`);

    this.simRunning = true;
    this.simStep = startSimStep;
    this.simStartStep = startSimStep;
    this.simStartTime = simStartTime;

    if (!this.loopInterval) {
      this.loopInterval = setInterval(() => this.loop(), SIM_PERIOD);
    }
  }

  stop() {
    console.log('Stop simulation');

    this.simRunning = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      delete this.loopInterval;
    }
  }

  loop() {
    const desiredSimStep = this.simStartStep + Math.floor((Date.now() + this.timeSkew - this.simStartTime) / SIM_PERIOD);
    if (desiredSimStep - this.simStep > 100) {
      console.error('Too many simulation steps missed');
    }

    while (this.simStep < desiredSimStep) {
      this.simStep += 1;
      this.update();
    }
  }

  update() {
    try {
      this.cars.forEach((car) => car.update(this.simStep));
    } catch (err) {
      console.error(`[${this.simStep}] Error updating cars`, err);
      this.stop();
    }
  }
};
