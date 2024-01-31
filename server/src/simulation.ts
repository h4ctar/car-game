import { config, Simulation, sub, length, add } from "@cargame/common";
import { Car } from "@cargame/common/lib/car";

export class ServerSimulation extends Simulation {
    /**
     * Add a new car.
     * @param id the ID of the car to add
     * @param username the cars username
     * @param color the colour of the car
     * @returns the newly added car
     */
    addCar(id: string, username: string, color: string) {
        const car = super.addCar(id, username, color);

        car.on("health", () => {
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
            [...thisCar.bullets].forEach((bullet) =>
                otherCars.forEach((otherCar) => {
                    const distance = length(
                        sub(bullet.position, otherCar.position),
                    );
                    if (distance < config.CAR_RADIUS) {
                        otherCar.health -= 10;

                        if (otherCar.score >= 10) {
                            otherCar.score -= 10;
                            this._spawnPickup(otherCar);
                        }

                        // remove the bullet
                        const index = thisCar.bullets.indexOf(bullet);
                        thisCar.bullets.splice(index, 1);
                    }
                }),
            );
        });

        // pickups
        [...this.cars].forEach((car) => {
            const range = {
                x: car.position.x - (config.CAR_RADIUS + config.PICKUP_RADIUS),
                y: car.position.y - (config.CAR_RADIUS + config.PICKUP_RADIUS),
                width: (config.CAR_RADIUS + config.PICKUP_RADIUS) * 2,
                height: (config.CAR_RADIUS + config.PICKUP_RADIUS) * 2,
            };
            const pickups = this.quadtree.query(config.PICKUP_TYPE, range);
            pickups.forEach((pickup) => {
                car.score += 10;
                this.deleteEntity(pickup.id!);
            });
        });
    }

    /**
     * Delete a car.
     * @param id the ID of the car to delete
     */
    deleteCar(id: string) {
        const car = this.cars.find((c) => c.id === id);
        if (car) {
            for (let i = 0; i < car.score / 10; i++) {
                this._spawnPickup(car);
            }
        }
        super.deleteCar(id);
    }

    _spawnPickup(car: Car) {
        const x = Math.random() - 0.5 * 300;
        const y = Math.random() - 0.5 * 300;
        this.addEntity(config.PICKUP_TYPE, add(car.position, { x, y }));
    }
}
