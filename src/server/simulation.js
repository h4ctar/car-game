const { CAR_RADIUS } = require('../common/config');
const { Simulation } = require('../common/simulation');
const { sub, length } = require('../common/vector');

exports.ServerSimulation = class ServerSimulation extends Simulation {
  update() {
    super.update();

    // check if bullet hits another car
    [...this.cars].forEach((thisCar) => {
      const otherCars = this.cars.filter((car) => car !== thisCar);

      thisCar.bullets.forEach((bullet) => otherCars.forEach((otherCar) => {
        const distance = length(sub(bullet.position, otherCar.position));
        if (distance < CAR_RADIUS) {
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
};
