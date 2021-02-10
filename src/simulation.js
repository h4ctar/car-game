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
    for (let i = 0; i < 1000; i += 1) {
      this.trees.push({
        x: Math.random() * 20000 - 10000,
        y: Math.random() * 20000 - 10000,
      });
    }
  }

  /**
   * Delete a car.
   * @param {Car} car the car to delete
   */
  deleteCar(car) {
    const index = this.cars.indexOf(car);
    if (index !== -1) {
      this.cars.splice(index, 1);
    }
  }
};
