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

    this._quadtree = new Quadtree({
      x: 0,
      y: 0,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    });

    /** @type {Car[]} */
    this.cars = [];

    // the next entity ID
    this._nextId = 0;
  }

  /**
   * Get a car by ID.
   * @param {string} id the id of the car
   * @return {Car} the car or undefined if it could not be found
   */
  getCar(id) {
    return this.cars.find((car) => car.id === id);
  }

  /**
   * Add a new car.
   * @param {string} id the ID of the car
   * @param {string} username the username of the car
   * @param {string} color the colour of the car
   * @returns {Car} the newly added car
   */
  addCar(id, username, color) {
    const car = new Car(id, username, color, this._quadtree);
    this.cars.push(car);
    return car;
  }

  /**
   * Delete a car.
   * @param {string} id the ID of the car to delete
   * @returns {void}
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
   * @param {number} startSimTime the simulation start time
   * @param {number} currentSimStep the current simulation step
   * @returns {void}
   */
  start(startSimTime, currentSimStep) {
    console.info(`Start simulation ${new Date(startSimTime)}, ${currentSimStep}`);

    this.simRunning = true;
    this.startSimTime = startSimTime;
    this.simStep = currentSimStep;

    if (!this.loopInterval) {
      this.loopInterval = setInterval(() => this.loop(), SIM_PERIOD);
    }
  }

  stop() {
    console.info('Stop simulation');

    this.simRunning = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      delete this.loopInterval;
    }
  }

  loop() {
    const desiredSimStep = Math.floor((Date.now() - this.timeSkew - this.startSimTime) / SIM_PERIOD);
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
    }
  }

  /**
   * @param {number} type
   * @param {Point2} point
   * @param {number} [id]
   */
  addEntity(type, point, id) {
    if (id === undefined) {
      id = this._nextId++;
    }

    const entity = this._quadtree.insert(type, point, id);
    if (entity) {
      this.emit('new-entity', { type: entity.type, point: entity.point, id: entity.id });
    }
  }

  deleteEntity(id) {
    if (this._quadtree.remove(id)) {
      this.emit('delete-entity', id);
    }
  }

  queryEntities(type, range) {
    return this._quadtree.query(type, range);
  }
};
