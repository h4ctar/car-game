import { EventEmitter } from "events";
import { Quadtree } from "./quadtree";
import { Car } from "./car";
import config from "./config";
import { Box, Point2 } from "./vector";

export class Simulation extends EventEmitter {
    startSimTime = 0;
    simStep = 0;
    simRunning = false;
    timeSkew = 0;
    cars: Car[] = [];
    loopInterval: NodeJS.Timeout | undefined;

    quadtree = new Quadtree({
        x: 0,
        y: 0,
        width: config.WORLD_WIDTH,
        height: config.WORLD_HEIGHT,
    });
    private _nextId = 0;

    /**
     * Get a car by ID.
     * @param id the id of the car
     * @return the car or undefined if it could not be found
     */
    getCar(id: string) {
        return this.cars.find((car) => car.id === id);
    }

    /**
     * Add a new car.
     * @param id the ID of the car
     * @param username the username of the car
     * @param color the colour of the car
     * @returns the newly added car
     */
    addCar(id: string, username: string, color: string) {
        const car = new Car(id, username, color, this.quadtree);
        this.cars.push(car);
        return car;
    }

    /**
     * Delete a car.
     * @param id the ID of the car to delete
     */
    deleteCar(id: string) {
        console.info(`Deleting car ${id}`);
        const index = this.cars.findIndex((car) => car.id === id);
        if (index !== -1) {
            this.cars.splice(index, 1);
            this.emit("delete-car", id);
        }
    }

    /**
     * @param startSimTime the simulation start time
     * @param currentSimStep the current simulation step
     */
    start(startSimTime: number, currentSimStep: number) {
        console.info(
            `Start simulation ${new Date(startSimTime)}, ${currentSimStep}`,
        );

        this.simRunning = true;
        this.startSimTime = startSimTime;
        this.simStep = currentSimStep;

        if (!this.loopInterval) {
            this.loopInterval = setInterval(
                () => this.loop(),
                config.SIM_PERIOD,
            );
        }
    }

    stop() {
        console.info("Stop simulation");

        this.simRunning = false;

        if (this.loopInterval) {
            clearInterval(this.loopInterval);
            delete this.loopInterval;
        }
    }

    loop() {
        const desiredSimStep = Math.floor(
            (Date.now() - this.timeSkew - this.startSimTime) /
                config.SIM_PERIOD,
        );
        if (desiredSimStep - this.simStep > 100) {
            console.error("Too many simulation steps missed");
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

    addEntity(type: number, point: Point2, id?: number) {
        if (id === undefined) {
            id = this._nextId++;
        }

        const entity = this.quadtree.insert(type, point, id);
        if (entity) {
            this.emit("new-entity", {
                type: entity.type,
                point: entity.point,
                id: entity.id,
            });
        }
    }

    deleteEntity(id: number) {
        if (this.quadtree.remove(id)) {
            this.emit("delete-entity", id);
        }
    }

    queryEntities(type: number, range: Box) {
        return this.quadtree.query(type, range);
    }
}
