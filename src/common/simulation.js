/**
 * @typedef { import("./vector").Point2 } Point2
 */

// eslint-disable-next-line no-unused-vars
const { Car } = require('./car');
const { SIM_PERIOD } = require('./config');
const { sub, length } = require('./vector');

exports.Simulation = class Simulation {
  /**
   * @param {boolean} server
   */
  constructor(server) {
    this.server = server;

    this.simRunning = false;
    // this.simStartTime = Date.now();
    // this.simStep = 0;

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
    const index = this.cars.findIndex((car) => car.id === id);
    if (index !== -1) {
      this.cars.splice(index, 1);
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

    setInterval(() => this.loop(), SIM_PERIOD);
  }

  loop() {
    const desiredSimStep = Math.floor((Date.now() - this.simStartTime) / SIM_PERIOD);
    if (desiredSimStep - this.simStep > 100) {
      throw new Error('Too many simulation steps missed');
    }

    while (this.simStep < desiredSimStep) {
      this.cars.forEach((car) => car.update(this.simStep));

      if (this.server) {
        // check if bullet hits another car
        [...this.cars].forEach((thisCar) => {
          const otherCars = this.cars.filter((car) => car !== thisCar);

          thisCar.bullets.forEach((bullet) => otherCars.forEach((otherCar) => {
            const distance = length(sub(bullet.position, otherCar.position));
            if (distance < 30) {
              thisCar.score += 10;
              otherCar.health -= 10;
              if (otherCar.health <= 0) {
                thisCar.score += 100;
                this.deleteCar(otherCar.id);
              }
            }
          }));
        });
      }

      this.simStep += 1;
    }
  }
};
