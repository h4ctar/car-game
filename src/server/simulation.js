const { CAR_RADIUS } = require('../common/config');
const { Simulation } = require('../common/simulation');
const { sub, length } = require('../common/vector');

exports.ServerSimulation = class ServerSimulation extends Simulation {
  /**
   * Add a new car.
   * @param {string} id
   * @param {string} username
   * @param {string} color
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

      [...thisCar.bullets].forEach((bullet) => otherCars.forEach((otherCar) => {
        const distance = length(sub(bullet.position, otherCar.position));
        if (distance < CAR_RADIUS) {
          thisCar.score += 10;
          otherCar.health -= 10;
          if (otherCar.health <= 0) {
            thisCar.score += 100;
          }

          // Remove the bullet
          const index = thisCar.bullets.indexOf(bullet);
          thisCar.bullets.splice(index, 1);
        }
      }));
    });
  }
};
