/**
 * @typedef { import("./vector").Point2 } Point2
 */

// eslint-disable-next-line no-unused-vars
const { Car } = require('./car');
const { SIM_PERIOD } = require('./config');

exports.Simulation = class Simulation extends EventTarget {
  constructor() {
    super();

    this.simRunning = false;

    /** @type {Car[]} */
    this.cars = [];

    /** @type {Point2[]} */
    this.trees = [];
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
    const car = new Car(id, username, color);
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

      const event = new Event('delete-car');
      // @ts-ignore
      event.data = id;
      this.dispatchEvent(event);
    }
  }

  /**
   * @param {number} startSimStep
   */
  start(startSimStep) {
    console.log(`Start simulation ${startSimStep}`);

    this.simRunning = true;
    this.simStep = startSimStep;
    this.simStartStep = startSimStep;
    this.simStartTime = Date.now();

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
    const desiredSimStep = this.simStartStep + Math.floor((Date.now() - this.simStartTime) / SIM_PERIOD);
    if (desiredSimStep - this.simStep > 100) {
      throw new Error('Too many simulation steps missed');
    }

    while (this.simStep < desiredSimStep) {
      this.update();

      this.simStep += 1;
    }
  }

  update() {
    this.cars.forEach((car) => car.update(this.simStep));
  }
};
