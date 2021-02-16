/**
 * @typedef { import("./vector").Point2 } Point2
 * @typedef {import("./vector").Box} Box
 */

const { EventEmitter } = require('events');
const { Quadtree, TREE } = require('./quadtree');
const { Car } = require('./car');
const { SIM_PERIOD, WORLD_WIDTH, WORLD_HEIGHT } = require('./config');

exports.Simulation = class Simulation extends EventEmitter {
  constructor() {
    super();

    this.simRunning = false;

    this._quadtree = new Quadtree({
      x: 0,
      y: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    });

    /** @type {Car[]} */
    this.cars = [];
  }

  /**
   * @param {Point2[]} trees
   */
  setTrees(trees) {
    trees.forEach((tree) => this._quadtree.insert(TREE, tree));
  }

  // todo: simulation interface
  /**
   * @param {Box} range
   */
  getTrees(range) {
    return this._quadtree.query(TREE, range);
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
    const car = new Car(id, username, color, this._quadtree);
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
