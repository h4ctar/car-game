import { createServer } from "http";
import { Server } from "socket.io";
import {
    CarInputEvent,
    HealthEvent,
    JoinEvent,
    PingEvent,
    PointRef,
    ScoreEvent,
    Scoreboard,
    config,
    randomPoint,
} from "@cargame/common";
import { Car } from "@cargame/common/lib/car";
import { ServerSimulation } from "./simulation";

const httpServer = createServer();
const io = new Server(httpServer, {
    serveClient: false,
});

const sim = new ServerSimulation();
sim.start(Date.now(), 0);

// todo: dont maintain this collection
// instead it needs to dynamically get entities from the quadtree
const entities: PointRef[] = [];

sim.on("new-entity", (entity) => {
    entities.push(entity);
    io.emit("new-entity", entity);
});

sim.on("delete-entity", (id: number) => {
    const index = entities.findIndex((entity) => entity.id === id);
    entities.splice(index, 1);
    io.emit("delete-entity", id);
});

for (let i = 0; i < 1000; i += 1) {
    sim.addEntity(config.TREE_TYPE, randomPoint());
    sim.addEntity(config.ROCK_TYPE, randomPoint());
}
for (let i = 0; i < 10000; i += 1) {
    sim.addEntity(config.PICKUP_TYPE, randomPoint());
}

const createScoreboard = () => {
    const scoreboard: Scoreboard = sim.cars
        .map((car) => ({
            username: car.username,
            score: car.score,
            color: car.color,
        }))
        .sort((a, b) => b.score - a.score);

    if (scoreboard.length > config.SCOREBOARD_LENGTH) {
        scoreboard.length = config.SCOREBOARD_LENGTH;
    }

    return scoreboard;
};

io.on("connection", (socket) => {
    // @ts-ignore
    const id = socket.request._query.id;

    console.info(`New client connected ${id}`);

    socket.emit("start", {
        startSimTime: sim.startSimTime,
        currentSimStep: sim.simStep,
    });

    sim.cars.forEach((car) => socket.emit("update-car", car.serialize()));
    const syncInterval = setInterval(() => {
        // todo: only cars near this car
        // todo: delete cars far away
        sim.cars.forEach((car) => socket.emit("update-car", car.serialize()));
    }, 5000);

    // todo: only entities around car
    socket.emit("entities", entities);

    // send the initial scoreboard
    socket.emit("scoreboard", createScoreboard());

    socket.on("ping", (pingEvent: PingEvent) => {
        const pongEvent = { ...pingEvent, pongTime: Date.now() };
        socket.emit("pong", pongEvent);
    });

    let socketCar: Car | undefined;

    socket.on("join", (event: JoinEvent) => {
        console.info(`Client joining ${event.username}`);

        // validate the color
        if (!config.COLORS.includes(event.color)) {
            console.error("The join event has an invalid colour");
            socket.disconnect();
            return;
        }

        socketCar = sim.addCar(id, event.username, event.color);

        socketCar.on("collide", () => {
            if (socketCar) {
                socketCar.health -= 10;
            }
        });

        socketCar.on("health", () => {
            if (socketCar) {
                const healthEvent: HealthEvent = {
                    id,
                    health: socketCar.health,
                };
                io.emit("health", healthEvent);
            }
        });

        socketCar.on("score", () => {
            if (socketCar) {
                const scoreEvent: ScoreEvent = { id, score: socketCar.score };
                io.emit("score", scoreEvent);

                io.emit("scoreboard", createScoreboard());
            }
        });

        if (process.env.NODE_ENV === "production") {
            socketCar.position = {
                x: Math.random() * config.WORLD_WIDTH,
                y: Math.random() * config.WORLD_HEIGHT,
            };
        } else {
            socketCar.position = {
                x: config.WORLD_WIDTH / 2,
                y: config.WORLD_HEIGHT / 2,
            };
        }

        // send an updated scoreboard including the new car
        io.emit("scoreboard", createScoreboard());

        io.emit("update-car", socketCar.serialize());
    });

    const deleteCarListener = (deletedCarId: number) => {
        if (socketCar && id === deletedCarId) {
            socketCar = undefined;
        }
        socket.emit("delete", deletedCarId);
    };
    sim.on("delete-car", deleteCarListener);

    // health regen
    const healthRegenInterval = setInterval(() => {
        if (socketCar && socketCar.health < 100) {
            socketCar.health = Math.min(socketCar.health + 5, 100);
        }
    }, 5000);

    // todo: remove console logs

    socket.on("input", (event: CarInputEvent) => {
        if (socketCar) {
            // validate the input
            if (event.id !== id) {
                console.error("Input event must be for socket car");
                socket.disconnect();
                return;
            }
            if (
                event.simStep < sim.simStep - 100 ||
                event.simStep > sim.simStep + 100
            ) {
                console.error("Input event is too old or too new");
                socket.disconnect();
                return;
            }
            if (
                event.accelerate !== undefined &&
                (event.accelerate < 0 || event.accelerate > 1)
            ) {
                console.error("Input event accelerate must be between 0 and 1");
                socket.disconnect();
                return;
            }
            if (
                event.steer !== undefined &&
                (event.steer < -config.STEER_RESOLUTION ||
                    event.steer > config.STEER_RESOLUTION)
            ) {
                console.error(
                    `Input event steer must be between ${-config.STEER_RESOLUTION} and ${
                        config.STEER_RESOLUTION
                    }`,
                );
                socket.disconnect();
                return;
            }

            socketCar.processInput(event, sim.simStep);

            // send the input to everyone except the sender because they have already processed it
            socket.broadcast.emit("input", event);
        }
    });

    socket.on("disconnect", () => {
        console.info(`Client disconnected ${id}`);

        if (socketCar) {
            sim.deleteCar(id);
        }

        if (syncInterval) {
            clearInterval(syncInterval);
        }

        if (healthRegenInterval) {
            clearInterval(healthRegenInterval);
        }

        sim.off("delete-car", deleteCarListener);
    });
});

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.info(`Listening at ${port}`));
