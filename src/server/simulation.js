/**
 * @typedef { import('../common/car').Car } Car
 */

const { CAR_RADIUS, PICKUP_TYPE, PICKUP_RADIUS } = require('../common/config');
const { Simulation } = require('../common/simulation');
const { sub, length } = require('../common/vector');

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
          thisCar.score += 10;
          otherCar.health -= 10;
          if (otherCar.health <= 0) {
            thisCar.score += 100;
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
      const pickups = this.quadtree.query(PICKUP_TYPE, range);
      pickups.forEach((pickup) => {
        car.score += 10;
        this.quadtree.remove(pickup);
        this.emit('delete-entity', pickup.id);
      });
    });
  }
};
