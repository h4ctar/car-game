import { EventEmitter } from "events";
import config from "./config";
import {
    add,
    multiply,
    dot,
    rotate,
    length,
    sub,
    divide,
    Point2,
} from "./vector";
import { Quadtree } from "./quadtree";
import { Bullet, CarHistory, CarInputEvent, UpdateEvent, Wheel } from "./type";
import { clamp, tween } from "./util";

const WHEEL_FL = 0;
const WHEEL_FR = 1;
const WHEEL_RL = 2;
const WHEEL_RR = 3;

const DEFAULT_INPUT = {
    steer: 0,
    accelerate: 0,
    brake: false,
    shoot: false,
};

export class Car extends EventEmitter {
    public id: string;
    public username: string;
    public color: string;
    private _quadtree: Quadtree;

    // static properties
    private wheelbase = 50;
    private track = 30;
    private mass = 3;
    private momentOfInertia =
        (this.mass / 12) *
        (this.wheelbase * this.wheelbase + this.track * this.track);
    private wheelWidth = 6;
    private wheelDiameter = 16;
    private bodyPath =
        "M 36.566565,-5.8117406 -6.6404056,-11.6064 l -6.1608904,3.6133498 -25.814007,0.0335 -0.0719,15.6430501 25.392317,-0.10692 6.0098604,4.0268801 44.0524606,-6.1022601 1.92174,-1.2032005 -0.0361,-9.0526 z";

    private reloadDuration = 10;

    // other properties
    private histories: CarHistory[] = [];
    private _inputEvents: CarInputEvent[] = [];
    private _score = 0;
    private _health = 100;

    // dynamic properties
    public position = { x: 0, y: 0 };
    private angle = 0;
    private velocity = { x: 1, y: 0 };
    private angularVelocity = 0;
    private wheels: Wheel[] = [
        {
            position: { x: this.wheelbase / 2, y: -this.track / 2 },
            angle: 0,
        },
        {
            position: { x: this.wheelbase / 2, y: this.track / 2 },
            angle: 0,
        },
        {
            position: { x: -this.wheelbase / 2, y: -this.track / 2 },
            angle: 0,
        },
        {
            position: { x: -this.wheelbase / 2, y: this.track / 2 },
            angle: 0,
        },
    ];
    public bullets: Bullet[] = [];
    private lastShootSimStep = 0;

    // devived stuff
    public speed = 0;
    public syncError = 0;

    /**
     * @param id the ID of the car
     * @param username the username of the car
     * @param color the colour of the car
     * @param quadtree the quadtree that contains objects the car may collide with
     */
    constructor(
        id: string,
        username: string,
        color: string,
        quadtree: Quadtree,
    ) {
        super();

        this.id = id;
        this.username = username;
        this.color = color;
        this._quadtree = quadtree;
    }

    /**
     * Set the health.
     * @param value the new health value
     */
    public set health(value: number) {
        if (this._health !== value) {
            this._health = value;
            this.emit("health");
        }
    }

    public get health() {
        return this._health;
    }

    /**
     * Set the score.
     * @param value the new score
     */
    public set score(value: number) {
        if (this._score !== value) {
            this._score = value;
            this.emit("score");
        }
    }

    public get score() {
        return this._score;
    }

    /**
     * @returns the update event
     */
    public serialize(): UpdateEvent {
        return {
            id: this.id,
            username: this.username,
            color: this.color,

            histories: this.histories,
            score: this.score,
            health: this.health,

            position: this.position,
            angle: this.angle,
            velocity: this.velocity,
            angularVelocity: this.angularVelocity,
            wheels: this.wheels,
        };
    }

    /**
     * @param event the update event to deserialize
     * @param  currentSimStep the current simulation step
     */
    public deserialize(event: UpdateEvent, currentSimStep: number) {
        const oldPosition = this.position;

        this.histories = event.histories;
        this.score = event.score;
        this.health = event.health;

        this.position = event.position;
        this.angle = event.angle;
        this.velocity = event.velocity;
        this.angularVelocity = event.angularVelocity;
        this.wheels = event.wheels;

        const lastHistory = this.histories[this.histories.length - 1];
        if (lastHistory) {
            if (lastHistory.simStep > currentSimStep) {
                // new history is in the future
                this.windBackTime(currentSimStep);
            } else if (lastHistory.simStep < currentSimStep) {
                // new history is in the past
                this.windForwardTime(currentSimStep);
            }
        }

        this.syncError = length(sub(oldPosition, this.position));
        if (this.syncError > 10) {
            console.error(`Large sync error: ${this.syncError}`);
        }

        this.checkHistory(currentSimStep);
    }

    /**
     * @param event the input event
     * @param  currentSimStep the current simulation step
     */
    public processInput(event: CarInputEvent, currentSimStep: number) {
        this._inputEvents.push(event);
        this._inputEvents.sort((a, b) => b.simStep - a.simStep);
        this._inputEvents.splice(100);

        if (event.simStep > currentSimStep) {
            // it's in the future, process it later
        } else {
            // it's in the past, wind back time
            this.windBackTime(event.simStep - 1);

            // and step forward until now (this will process it)
            this.windForwardTime(currentSimStep);
        }
    }

    /**
     * @param desiredSimStep the desired simulation step
     */
    public windBackTime(desiredSimStep: number) {
        // find the history just after the desired simulation step
        const historyIndex = this.histories.findIndex(
            (h) => h.simStep === desiredSimStep + 1,
        );

        if (historyIndex !== -1) {
            const history = this.histories[historyIndex];

            // remove history after this history point (including this point)
            this.histories.splice(historyIndex);

            // reset this to the history point that we've removed
            this.position = history.position;
            this.angle = history.angle;
            this.velocity = history.velocity;
            this.angularVelocity = history.angularVelocity;
            this.wheels = history.wheels.map((wheel) => ({ ...wheel }));
        } else {
            console.warn(`No history at ${desiredSimStep}`);
        }

        this.checkHistory(desiredSimStep);
    }

    /**
     * @param  desiredSimStep the desired simulation step
     */
    public windForwardTime(desiredSimStep: number) {
        const lastHistory = this.histories[this.histories.length - 1];
        if (lastHistory) {
            let simStep = lastHistory.simStep;
            while (simStep < desiredSimStep) {
                simStep += 1;
                this.update(simStep);
            }
        } else {
            console.warn(`No history at ${desiredSimStep}`);
        }
    }

    /**
     * @param  simStep the current simulation step
     */
    public update(simStep: number) {
        // add history to the end of histories queue
        this.histories.push({
            simStep,
            position: this.position,
            angle: this.angle,
            velocity: this.velocity,
            angularVelocity: this.angularVelocity,
            wheels: this.wheels.map((wheel) => ({ ...wheel })),
        });

        // make sure it never gets too long
        this.histories.splice(0, this.histories.length - 100);

        this.checkHistory(simStep);

        // apply input
        const input = this.currentInput(simStep);

        // steer the wheels
        // ackerman https://datagenetics.com/blog/december12016/index.html
        let targetLeftAngle = 0;
        let targetRightAngle = 0;
        if (input.steer) {
            const speed = length(this.velocity);
            // bigger turn radius when going faster
            const turnRadius = (clamp(speed, 0, 1500) / 1500) * 300 + 40;
            targetLeftAngle =
                (input.steer / config.STEER_RESOLUTION) *
                Math.atan(
                    this.wheelbase /
                        (turnRadius +
                            (Math.sign(input.steer) * this.track) / 2),
                );
            targetRightAngle =
                (input.steer / config.STEER_RESOLUTION) *
                Math.atan(
                    this.wheelbase /
                        (turnRadius -
                            (Math.sign(input.steer) * this.track) / 2),
                );
        }

        this.wheels[WHEEL_FL].angle = tween(
            this.wheels[WHEEL_FL].angle,
            targetLeftAngle,
            4 * config.DT,
        );
        this.wheels[WHEEL_FR].angle = tween(
            this.wheels[WHEEL_FR].angle,
            targetRightAngle,
            4 * config.DT,
        );

        const heading = rotate({ x: 1, y: 0 }, this.angle);
        this.speed = dot(this.velocity, heading);

        let brake = input.brake;
        let reverse = false;
        if (brake && this.speed < 1) {
            brake = false;
            reverse = true;
        }

        // todo: power curve
        const wheelForce =
            input.accelerate && input.accelerate > 0
                ? input.accelerate * 160
                : reverse
                  ? -80
                  : 0;

        // calculate the acceleration
        let acceleration = { x: 0, y: 0 };
        let angularAcceleration = 0;
        this.wheels.forEach((wheel, wheelIndex) => {
            const wheelPosition = rotate(wheel.position, this.angle);
            const wheelVelocity = add(
                this.velocity,
                multiply(
                    { x: -wheelPosition.y, y: wheelPosition.x },
                    this.angularVelocity,
                ),
            );

            let force = { x: 0, y: 0 };

            // power
            if (wheelIndex === WHEEL_RL || wheelIndex === WHEEL_RR) {
                force = add(
                    force,
                    rotate({ x: wheelForce, y: 0 }, this.angle + wheel.angle),
                );
            }

            // brake
            const longitudinalFrictionConstant = brake ? 0.9 : 0.1;
            const longitudinalNormal = rotate(
                { x: 1, y: 0 },
                this.angle + wheel.angle,
            );
            const longitudinalVelocity = multiply(
                longitudinalNormal,
                dot(longitudinalNormal, wheelVelocity),
            );
            const longitudinalFrictionForce = multiply(
                longitudinalVelocity,
                -longitudinalFrictionConstant,
            );
            force = add(force, longitudinalFrictionForce);

            // slide
            const lateralFrictionConstant = 2;
            const lateralNormal = rotate(
                { x: 0, y: 1 },
                this.angle + wheel.angle,
            );
            const lateralVelocity = multiply(
                lateralNormal,
                dot(lateralNormal, wheelVelocity),
            );
            const lateralFrictionForce = multiply(
                lateralVelocity,
                -lateralFrictionConstant,
            );
            force = add(force, lateralFrictionForce);

            acceleration = add(acceleration, multiply(force, this.mass));
            angularAcceleration +=
                (wheelPosition.x * force.y - wheelPosition.y * force.x) /
                this.momentOfInertia;
        });

        // update velocity with new forces
        this.velocity = add(this.velocity, multiply(acceleration, config.DT));
        this.angularVelocity += angularAcceleration * config.DT;

        // update position with velocity
        this.position = add(this.position, multiply(this.velocity, config.DT));
        this.angle += this.angularVelocity * config.DT;

        if (input.shoot) {
            if (simStep >= this.lastShootSimStep + this.reloadDuration) {
                const bulletSpeed = 1000;
                const bulletVelocity = add(
                    this.velocity,
                    rotate({ x: bulletSpeed, y: 0 }, this.angle),
                );
                const bullet = {
                    position: this.position,
                    velocity: bulletVelocity,
                    startSimStep: simStep,
                };
                this.bullets.push(bullet);
                this.lastShootSimStep = simStep;
            }
        }

        this.bullets = this.bullets.filter(
            (bullet) => simStep - bullet.startSimStep < 50,
        );
        this.bullets.forEach((bullet) => {
            bullet.position = add(
                bullet.position,
                multiply(bullet.velocity, config.DT),
            );
        });

        this.collideAll(config.TREE_TYPE, config.TREE_RADIUS);
        this.collideAll(config.ROCK_TYPE, config.ROCK_RADIUS);
    }

    public lastInput() {
        return this._inputEvents[0] || DEFAULT_INPUT;
    }

    public currentInput(simStep: number) {
        return (
            this._inputEvents.find((event) => event.simStep < simStep) ||
            DEFAULT_INPUT
        );
    }

    /**
     * @param  type the type of object to collide with
     * @param radius the radius of the objects
     */
    public collideAll(type: number, radius: number) {
        const range = {
            x: this.position.x - (config.CAR_RADIUS + radius),
            y: this.position.y - (config.CAR_RADIUS + radius),
            width: (config.CAR_RADIUS + radius) * 2,
            height: (config.CAR_RADIUS + radius) * 2,
        };
        const trees = this._quadtree.query(type, range);
        trees.forEach((tree) => this.collide(tree.point, radius));
    }

    /**
     * @param point the position of the object to collide with
     * @param radius the radius of the object
     */
    public collide(point: Point2, radius: number) {
        const vector = sub(point, this.position);
        const distance = length(vector);
        if (distance < config.CAR_RADIUS + radius) {
            // console.log('collide');
            const normal = divide(vector, distance);
            const d = dot(this.velocity, normal);
            this.velocity = sub(this.velocity, multiply(normal, 2 * d));
            this.position = sub(
                point,
                multiply(vector, (config.CAR_RADIUS + radius) / distance),
            );

            this.emit("collide");
        }
    }

    /**
     * @param context the canvas drawing context
     */
    public draw(context: CanvasRenderingContext2D) {
        context.save();
        context.translate(this.position.x, this.position.y);

        // draw the username
        context.save();
        context.fillStyle = this.color;
        context.textAlign = "center";
        context.font = "16px TheGoodMonolith";
        context.scale(1, -1);
        context.fillText(this.username, 0, -42);

        context.fillStyle = "red";
        context.fillRect(-40, 40, this.health * 0.8, 4);
        context.restore();

        context.rotate(this.angle);

        // draw the body
        context.lineWidth = 2;
        context.strokeStyle = this.color;

        // todo: car svg asf
        context.stroke(new Path2D(this.bodyPath));

        if (process.env.NODE_ENV !== "production") {
            context.beginPath();
            context.arc(0, 0, config.CAR_RADIUS, 0, 2 * Math.PI);
            context.stroke();
        }

        // draw the wheels
        context.beginPath();
        context.strokeStyle = this.color;
        this.wheels.forEach((wheel) => this.drawWheel(wheel, context));
        context.stroke();

        context.restore();

        this.bullets.forEach((bullet) => Car.drawBullet(bullet, context));
    }

    /**
     * @param wheel the wheel to draw
     * @param context the canvas drawing context
     */
    public drawWheel(wheel: Wheel, context: CanvasRenderingContext2D) {
        context.save();
        context.translate(wheel.position.x, wheel.position.y);
        context.rotate(wheel.angle);
        context.rect(
            -this.wheelDiameter / 2,
            -this.wheelWidth / 2,
            this.wheelDiameter,
            this.wheelWidth,
        );

        context.restore();
    }

    /**
     * @param bullet the bullet to draw
     * @param context the canvas drawing context
     */
    static drawBullet(bullet: Bullet, context: CanvasRenderingContext2D) {
        context.fillStyle = "white";
        context.fillRect(bullet.position.x, bullet.position.y, 2, 2);
    }

    /**
     * @param currentSimStep the current simulation step
     */
    public checkHistory(currentSimStep: number) {
        if (process.env.NODE_ENV !== "production") {
            if (this.histories.length > 0) {
                const firstHistory = this.histories[0];
                const lastHistory = this.histories[this.histories.length - 1];

                // the histories must be in order and no steps should be skipped
                let simStep = firstHistory.simStep;
                for (let i = 1; i < this.histories.length; i += 1) {
                    simStep += 1;
                    if (this.histories[i].simStep !== simStep) {
                        console.error(
                            `[${currentSimStep}] ${this.username} - Histories are missing or out of order`,
                        );
                    }
                }

                // the last history simulation step should be the current simulation step
                if (lastHistory.simStep !== currentSimStep) {
                    console.error(
                        `[${currentSimStep}] ${this.username} - The last history is incorrect`,
                    );
                }
            }
        }
    }
}
