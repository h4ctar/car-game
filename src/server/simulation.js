/**
 * @typedef { import('../common/car').Car } Car
 */

const { CAR_RADIUS, PICKUP_TYPE, PICKUP_RADIUS } = require('../common/config');
const { Simulation } = require('../common/simulation');
const { sub, length, add } = require('../common/vector');

exports.ServerSimulation = class ServerSimulation extends Simulation {
  /**
   * Add a new car.
   * @param {string} id the ID of the car to add
   * @param {string} username the cars username
   * @param {string} color the colour of the car
   * @returns {Car} the newly added car
   */
  addCar(id, username, color) {
    const car = super.addCar(id, username, color);

    car.on('health', () => {
      if (car.health <= 0) {
        this.deleteCar(car.id);

        for (let i = 0; i < car.score / 10; i++) {
          this._spawnPickup(car);
        }
      }
    });

    return car;
  }

  update() {
    super.update();

    // check if bullet hits another car
    [...this.cars].forEach((thisCar) => {
      const otherCars = this.cars.filter((car) => car !== thisCar);

      // todo: bullets in quadtree
      [...thisCar.bullets].forEach((bullet) => otherCars.forEach((otherCar) => {
        const distance = length(sub(bullet.position, otherCar.position));
        if (distance < CAR_RADIUS) {
          otherCar.health -= 10;

          if (otherCar.score >= 10) {
            otherCar.score -= 10;
            this._spawnPickup(otherCar);
          }

          // remove the bullet
          const index = thisCar.bullets.indexOf(bullet);
          thisCar.bullets.splice(index, 1);
        }
      }));
    });

    // pickups
    [...this.cars].forEach((car) => {
      const range = {
        x: car.position.x - (CAR_RADIUS + PICKUP_RADIUS),
        y: car.position.y - (CAR_RADIUS + PICKUP_RADIUS),
        width: (CAR_RADIUS + PICKUP_RADIUS) * 2,
        height: (CAR_RADIUS + PICKUP_RADIUS) * 2,
      };
      const pickups = this._quadtree.query(PICKUP_TYPE, range);
      pickups.forEach((pickup) => {
        car.score += 10;
        this.deleteEntity(pickup.id);
      });
    });
  }

  _spawnPickup(car) {
    this.addEntity(PICKUP_TYPE, add(car.position, { x: Math.random() * 200 - 100, y: Math.random() * 200 - 100 }));
  }
};
