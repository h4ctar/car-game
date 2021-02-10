/**
 * @typedef { import("./vector").Point2 } Point2
 */

// eslint-disable-next-line no-unused-vars
const { Car } = require('./car');

exports.Simulation = class Simulation {
  constructor() {
    this.simStartTime = Date.now();
    this.simStep = 0;

    /** @type {Car[]} */
    this.cars = [];

    /** @type {Point2[]} */
    this.trees = [];
  }

  getCar(id) {
    return this.cars.find((car) => car.id === id);
  }

  addCar(id, username, color) {
    const car = new Car(id, username, color);
    this.cars.push(car);
    return car;
  }

  /**
   * Delete a car.
   */
  deleteCar(id) {
    const index = this.cars.findIndex((car) => car.id === id);
    if (index !== -1) {
      this.cars.splice(index, 1);
    }
  }

  update() {
    this.cars.forEach((car) => car.update(this.simStep));
  }
};
