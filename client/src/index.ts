import {
    Box,
    Point2,
    PointRef,
    Scoreboard,
    UpdateEvent,
    config,
} from "@cargame/common";
import { Simulation } from "@cargame/common";
import { rotate, sub, add, grow } from "@cargame/common";
import { myId } from "./id";
import { checkInput } from "./input";
import { socket } from "./socket";
import { showStartCard } from "./start-card";
import { Car } from "@cargame/common/lib/car";

const canvas = $("#canvas")!;
canvas.prop("width", window.innerWidth);
canvas.prop("height", window.innerHeight);
window.addEventListener("resize", () => {
    canvas.prop("width", window.innerWidth);
    canvas.prop("height", window.innerHeight);
});

// @ts-ignore
const context = canvas[0].getContext("2d");

const treeImage = new Image();
treeImage.src = "tree.svg";

const rockImage = new Image();
rockImage.src = "rock.svg";

const pickupImage = new Image();
pickupImage.src = "pickup.svg";

const sim = new Simulation();

let scoreboard: Scoreboard = [];

socket.on("start", (event) =>
    sim.start(event.startSimTime, event.currentSimStep),
);

socket.on("disconnect", () => sim.stop());

// https://distributedsystemsblog.com/docs/clock-synchronization-algorithms/#christians-algorithm
setInterval(() => {
    /** @type {PingEvent} */
    const event = { pingTime: Date.now() };
    socket.emit("ping", event);
}, 1000);

let latency = 0;
socket.on("pong", (/** @type {PongEvent} */ event) => {
    const clientTime = Date.now();
    const rtt = clientTime - event.pingTime;
    latency = rtt / 2;
    const serverTime = event.pongTime + latency;
    const oldTimeSkew = sim.timeSkew;
    const newTimeSkew = clientTime - serverTime;
    sim.timeSkew = oldTimeSkew * 0.9 + newTimeSkew * 0.1;
});

let myCar: Car | undefined;

socket.on("update-car", (event: UpdateEvent) => {
    let car = sim.getCar(event.id);

    if (!car) {
        console.info("New car", event.id);

        car = sim.addCar(event.id, event.username, event.color);

        if (car.id === myId) {
            myCar = car;
        }
    }

    car.deserialize(event, sim.simStep);
});

socket.on("delete", (id: string) => {
    console.info(`Delete car ${id}`);

    sim.deleteCar(id);

    if (id === myCar?.id) {
        myCar = undefined;
        showStartCard();
    }
});

socket.on("input", (/** @type {CarInputEvent} */ event) => {
    const car = sim.getCar(event.id);
    if (car) {
        car.processInput(event, sim.simStep);
    }
});

socket.on("score", (/** @type {ScoreEvent} */ event) => {
    const car = sim.getCar(event.id);
    if (car) {
        car.score = event.score;
    }
});

socket.on("scoreboard", (/** @type {Scoreboard} */ newScoreboard) => {
    scoreboard = newScoreboard;
});

socket.on("health", (/** @type {HealthEvent} */ event) => {
    const car = sim.getCar(event.id);
    if (car) {
        car.health = event.health;
    }
});

socket.on("entities", (entities: PointRef[]) =>
    entities.forEach((entity) =>
        sim.addEntity(entity.type, entity.point, entity.id),
    ),
);
socket.on("new-entity", (entity) =>
    sim.addEntity(entity.type, entity.point, entity.id),
);
socket.on("delete-entity", (/** @type {number} */ id) => sim.deleteEntity(id));

const inputLoop = () => {
    if (myCar) {
        checkInput(myCar, sim.simStep);
    }
};
setInterval(inputLoop, config.SIM_PERIOD);

/**
 * @param camera the position of the camera
 */
const drawMap = (camera: Point2) => {
    const GRID_SIZE = 200;
    context.beginPath();
    context.strokeStyle = "grey";
    for (let x = -(camera.x % GRID_SIZE); x < canvas.width()!; x += GRID_SIZE) {
        context.moveTo(x, 0);
        context.lineTo(x, canvas.height());
    }
    for (let y = camera.y % GRID_SIZE; y < canvas.height()!; y += GRID_SIZE) {
        context.moveTo(0, y);
        context.lineTo(canvas.width(), y);
    }
    context.stroke();
};

/**
 * Draw all the objects of a single type.
 * @param viewport the visible viewport
 * @param type the type of object to draw
 * @param radius the radius of the object
 * @param image the image to draw
 */
const drawObjects = (
    viewport: Box,
    type: number,
    radius: number,
    image: HTMLImageElement,
) => {
    const visibleRange = grow(viewport, radius);
    const objects = sim.queryEntities(type, visibleRange);
    objects.forEach((object) => {
        context.drawImage(
            image,
            object.point.x - image.width / 2,
            object.point.y - image.height / 2,
        );

        if (process.env.NODE_ENV !== "production") {
            context.beginPath();
            context.arc(object.point.x, object.point.y, radius, 0, 2 * Math.PI);
            context.stroke();
        }
    });
};

const drawRadar = () => {
    if (myCar) {
        const radarRadius = 100;
        sim.cars
            .filter((car) => car !== myCar)
            .forEach((car) => {
                const v = sub(car.position, myCar!.position);
                const angle = Math.atan2(-v.y, v.x);
                const blipPosition = add(
                    rotate({ x: radarRadius, y: 0 }, angle),
                    { x: canvas.width()! / 2, y: canvas.height()! / 2 },
                );

                context.fillStyle = car.color;
                context.fillRect(blipPosition.x, blipPosition.y, 4, 4);
            });
    }
};

const drawScore = () => {
    if (myCar) {
        context.save();
        context.fillStyle = myCar.color;
        context.font = "30px TheGoodMonolith";
        context.fillText(String(myCar.score), 10, 30);
        context.restore();
    }
};

const drawScoreboard = () => {
    if (scoreboard) {
        context.save();
        context.font = "16px TheGoodMonolith";
        scoreboard.forEach((entry, index) => {
            const username = entry.username.substring(0, 14).padEnd(14);
            const score = String(entry.score).padStart(5);
            context.fillStyle = entry.color;
            context.fillText(
                `${username} ${score}`,
                canvas.width()! - 200,
                30 + index * 20,
            );
        });
        context.restore();
    }
};

const drawDebug = () => {
    if (process.env.NODE_ENV !== "production") {
        context.save();
        context.fillStyle = "white";
        context.font = "16px TheGoodMonolith";
        context.fillText(`Latency: ${Math.round(latency)}`, 10, 50);
        context.fillText(`Time skew: ${Math.round(sim.timeSkew)}`, 10, 70);
        context.fillText(`Sync error: ${myCar && myCar.syncError}`, 10, 90);
        context.fillText(`Speed: ${myCar && Math.round(myCar.speed)}`, 10, 110);
        context.restore();
    }
};

const draw = () => {
    if (sim.simRunning) {
        const camera = myCar ? myCar.position : { x: 0, y: 0 };
        const viewport: Box = {
            x: camera.x - canvas.width()! / 2,
            y: camera.y - canvas.height()! / 2,
            width: canvas.width()!,
            height: canvas.height()!,
        };

        context.fillStyle = "black";
        context.fillRect(0, 0, canvas.width(), canvas.height());

        drawMap(camera);

        context.save();
        context.translate(
            canvas.width()! / 2,
            canvas.height()! - canvas.height()! / 2,
        );
        context.scale(1, -1);

        context.translate(-camera.x, -camera.y);

        sim.cars.forEach((car) => car.draw(context));

        drawObjects(viewport, config.TREE_TYPE, config.TREE_RADIUS, treeImage);
        drawObjects(viewport, config.ROCK_TYPE, config.ROCK_RADIUS, rockImage);
        drawObjects(
            viewport,
            config.PICKUP_TYPE,
            config.PICKUP_RADIUS,
            pickupImage,
        );

        context.restore();

        drawRadar();
        drawScore();
        drawScoreboard();
        drawDebug();
    }

    window.requestAnimationFrame(draw);
};
draw();
