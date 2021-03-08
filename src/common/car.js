/**
 * @typedef { import("./vector").Point2 } Point2
 * @typedef { import("./type").Wheel } Wheel
 * @typedef { import("./type").Bullet } Bullet
 * @typedef { import("./quadtree").Quadtree } Quadtree
 * @typedef { import("./type").InputEvent } InputEvent
 * @typedef { import("./type").UpdateEvent } UpdateEvent
 */

const { EventEmitter } = require('events');
const util = require('./util');
const {
  DT, STEER_RESOLUTION, CAR_RADIUS, TREE_RADIUS, ROCK_TYPE, ROCK_RADIUS, TREE_TYPE,
} = require('./config');
const {
  add, multiply, dot, rotate, length, sub, divide,
} = require('./vector');

const WHEEL_FL = 0;
const WHEEL_FR = 1;
const WHEEL_RL = 2;
const WHEEL_RR = 3;

exports.Car = class Car extends EventEmitter {
  /**
   * @param {string} id the ID of the car
   * @param {string} username the username of the car
   * @param {string} color the colour of the car
   * @param {Quadtree} quadtree the quadtree that contains objects the car may collide with
   */
  constructor(id, username, color, quadtree) {
    super();

    this.id = id;
    this.username = username;
    this.color = color;
    this._quadtree = quadtree;

    // static properties
    this.wheelbase = 50;
    this.track = 30;
    this.mass = 3;
    this.momentOfInertia = (this.mass / 12) * (this.wheelbase * this.wheelbase + this.track * this.track);

    this.wheelWidth = 6;
    this.wheelDiameter = 16;
    this.bodyPath = 'M 36.566565,-5.8117406 -6.6404056,-11.6064 l -6.1608904,3.6133498 -25.814007,0.0335 -0.0719,15.6430501 25.392317,-0.10692 6.0098604,4.0268801 44.0524606,-6.1022601 1.92174,-1.2032005 -0.0361,-9.0526 z';

    this.reloadDuration = 10;

    // other properties
    // todo: history type
    this.histories = [];

    /** @type {InputEvent[]} */
    this.inputEvents = [];

    this._score = 0;
    this._health = 100;

    // dynamic properties
    this.position = { x: 0, y: 0 };
    this.angle = 0;
    this.velocity = { x: 1, y: 0 };
    this.angularVelocity = 0;
    this.steer = 0;
    this.accelerate = false;
    this.brake = false;
    this.shoot = false;

    /** @type { Wheel[] } */
    this.wheels = [
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

    /** @type { Bullet[] } */
    this.bullets = [];
    this.lastShootSimStep = 0;

    // devived stuff
    this.speed = 0;
  }

  /**
   * Set the health.
   * @param {number} value the new health value
   */
  set health(value) {
    if (this._health !== value) {
      this._health = value;
      this.emit('health');
    }
  }

  get health() {
    return this._health;
  }

  /**
   * Set the score.
   * @param {number} value the new score
   */
  set score(value) {
    if (this._score !== value) {
      this._score = value;
      this.emit('score');
    }
  }

  get score() {
    return this._score;
  }

  /**
   * @returns {UpdateEvent} the update event
   */
  serialize() {
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
      steer: this.steer,
      accelerate: this.accelerate,
      brake: this.brake,
      shoot: this.shoot,
      wheels: this.wheels,
      bullets: this.bullets,
    };
  }

  /**
   * @param {UpdateEvent} event the update event to deserialize
   * @param {number} currentSimStep the current simulation step
   * @returns {void}
   */
  deserialize(event, currentSimStep) {
    const oldPosition = this.position;

    this.histories = event.histories;
    this.score = event.score;
    this.health = event.health;
    this.position = event.position;
    this.angle = event.angle;
    this.velocity = event.velocity;
    this.angularVelocity = event.angularVelocity;
    this.steer = event.steer;
    this.accelerate = event.accelerate;
    this.brake = event.brake;
    this.shoot = event.shoot;
    this.wheels = event.wheels;
    this.bullets = event.bullets;

    const lastHistory = this.histories[this.histories.length - 1];
    if (lastHistory) {
      if (lastHistory.simStep === currentSimStep) {
        // all good
      } else if (lastHistory.simStep > currentSimStep) {
        // new history is in the future
        this.windBackTime(currentSimStep);
      } else if (lastHistory.simStep < currentSimStep) {
        // new history is in the past
        let simStep = lastHistory.simStep;
        while (simStep < currentSimStep) {
          simStep += 1;
          this.update(simStep);
        }
      }
    } else {
      console.error('no last history');
    }

    console.error('sync error', length(sub(oldPosition, this.position)));

    this.checkHistory(currentSimStep);
  }

  /**
   * @param {InputEvent} event the input event
   * @param {number} currentSimStep the current simulation step
   * @returns {void}
   */
  processInput(event, currentSimStep) {
    this.inputEvents.push(event);
    this.inputEvents.sort((a, b) => a.simStep - b.simStep);
    // only remember 20 input events
    this.inputEvents.splice(0, this.inputEvents.length - 20);

    if (event.simStep > currentSimStep) {
      // it's in the future, process it later
    } else {
      // it's in the past, wind back time
      this.windBackTime(event.simStep - 1);

      // and step forward until now
      let simStep = event.simStep - 1;
      while (simStep < currentSimStep) {
        simStep += 1;
        this.update(simStep);
      }
    }
  }

  /**
   * @param {number} desiredSimStep the desired simulation step
   * @returns {void}
   */
  windBackTime(desiredSimStep) {
    // find the point with desired simulation step
    const historyIndex = this.histories.findIndex((h) => h.simStep === desiredSimStep + 1);

    if (historyIndex !== -1) {
      const history = this.histories[historyIndex];

      // remove history after this history point
      this.histories.splice(historyIndex);

      // reset this to the history point
      this.position = history.position;
      this.angle = history.angle;
      this.velocity = history.velocity;
      this.angularVelocity = history.angularVelocity;
      this.steer = history.steer;
      this.accelerate = history.accelerate;
      this.brake = history.brake;
      this.shoot = history.shoot;
      this.wheels = history.wheels.map((wheel) => ({ ...wheel }));
      this.bullets = history.bullets.map((bullet) => ({ ...bullet }));
    } else {
      console.warn(`No history at ${desiredSimStep}`);
    }

    this.checkHistory(desiredSimStep);
  }

  /**
   * @param {InputEvent} event the input event
   * @returns {void}
   */
  applyInput(event) {
    this.steer = event.steer;
    this.accelerate = event.accelerate;
    this.brake = event.brake;
    this.shoot = event.shoot;
  }

  /**
   * @param {number} simStep the current simulation step
   * @returns {void}
   */
  update(simStep) {
    // add history to the end of histories queue
    this.histories.push({
      simStep,
      position: this.position,
      angle: this.angle,
      velocity: this.velocity,
      angularVelocity: this.angularVelocity,
      steer: this.steer,
      accelerate: this.accelerate,
      brake: this.brake,
      shoot: this.shoot,
      wheels: this.wheels.map((wheel) => ({ ...wheel })),
      bullets: this.bullets.map((bullet) => ({ ...bullet })),
    });

    // make sure it never gets too long
    this.histories.splice(0, this.histories.length - 100);

    this.checkHistory(simStep);

    // apply input
    this.inputEvents
      .filter((event) => event.simStep === simStep)
      .forEach((event) => this.applyInput(event));

    // steer the wheels
    // ackerman https://datagenetics.com/blog/december12016/index.html
    let targetLeftAngle = 0;
    let targetRightAngle = 0;
    if (this.steer !== 0) {
      const speed = length(this.velocity);
      // bigger turn radius when going faster
      const turnRadius = util.clamp(speed, 0, 1500) / 1500 * 300 + 40;
      targetLeftAngle = this.steer / STEER_RESOLUTION * Math.atan(this.wheelbase / (turnRadius + Math.sign(this.steer) * this.track / 2));
      targetRightAngle = this.steer / STEER_RESOLUTION * Math.atan(this.wheelbase / (turnRadius - Math.sign(this.steer) * this.track / 2));
    }

    this.wheels[WHEEL_FL].angle = util.tween(this.wheels[WHEEL_FL].angle, targetLeftAngle, 4 * DT);
    this.wheels[WHEEL_FR].angle = util.tween(this.wheels[WHEEL_FR].angle, targetRightAngle, 4 * DT);

    const heading = rotate({ x: 1, y: 0 }, this.angle);
    this.speed = dot(this.velocity, heading);

    let brake = this.brake;
    let reverse = false;
    if (brake && this.speed < 1) {
      brake = false;
      reverse = true;
    }

    // todo: power curve
    const wheelForce = this.accelerate ? 160 : reverse ? -80 : 0;

    // calculate the acceleration
    let acceleration = { x: 0, y: 0 };
    let angularAcceleration = 0;
    this.wheels.forEach((wheel, wheelIndex) => {
      const wheelPosition = rotate(wheel.position, this.angle);
      const wheelVelocity = add(this.velocity, multiply({ x: -wheelPosition.y, y: wheelPosition.x }, this.angularVelocity));

      let force = { x: 0, y: 0 };

      // power
      if (wheelIndex === WHEEL_RL || wheelIndex === WHEEL_RR) {
        force = add(force, rotate({ x: wheelForce, y: 0 }, this.angle + wheel.angle));
      }

      // brake
      const longitudinalFrictionConstant = brake ? 0.9 : 0.1;
      const longitudinalNormal = rotate({ x: 1, y: 0 }, this.angle + wheel.angle);
      const longitudinalVelocity = multiply(longitudinalNormal, dot(longitudinalNormal, wheelVelocity));
      const longitudinalFrictionForce = multiply(longitudinalVelocity, -longitudinalFrictionConstant);
      force = add(force, longitudinalFrictionForce);

      // slide
      const lateralFrictionConstant = 2;
      const lateralNormal = rotate({ x: 0, y: 1 }, this.angle + wheel.angle);
      const lateralVelocity = multiply(lateralNormal, dot(lateralNormal, wheelVelocity));
      const lateralFrictionForce = multiply(lateralVelocity, -lateralFrictionConstant);
      force = add(force, lateralFrictionForce);

      acceleration = add(acceleration, multiply(force, this.mass));
      angularAcceleration += (wheelPosition.x * force.y - wheelPosition.y * force.x) / this.momentOfInertia;
    });

    // update velocity with new forces
    this.velocity = add(this.velocity, multiply(acceleration, DT));
    this.angularVelocity += angularAcceleration * DT;

    // update position with velocity
    this.position = add(this.position, multiply(this.velocity, DT));
    this.angle += this.angularVelocity * DT;

    if (this.shoot) {
      if (simStep >= this.lastShootSimStep + this.reloadDuration) {
        const bulletSpeed = 1000;
        const bulletVelocity = add(this.velocity, rotate({ x: bulletSpeed, y: 0 }, this.angle));
        const bullet = { position: this.position, velocity: bulletVelocity, startSimStep: simStep };
        this.bullets.push(bullet);
        this.lastShootSimStep = simStep;
      }
    }

    this.bullets = this.bullets.filter((bullet) => simStep - bullet.startSimStep < 50);
    this.bullets.forEach((bullet) => { bullet.position = add(bullet.position, multiply(bullet.velocity, DT)); });

    this.collideAll(TREE_TYPE, TREE_RADIUS);
    this.collideAll(ROCK_TYPE, ROCK_RADIUS);
  }

  /**
   * @param {number} type the type of object to collide with
   * @param {number} radius the radius of the objects
   * @returns {void}
   */
  collideAll(type, radius) {
    const range = {
      x: this.position.x - (CAR_RADIUS + radius),
      y: this.position.y - (CAR_RADIUS + radius),
      width: (CAR_RADIUS + radius) * 2,
      height: (CAR_RADIUS + radius) * 2,
    };
    const trees = this._quadtree.query(type, range);
    trees.forEach((tree) => this.collide(tree.point, radius));
  }

  /**
   * @param {Point2} point the position of the object to collide with
   * @param {number} radius the radius of the object
   * @returns {void}
   */
  collide(point, radius) {
    const vector = sub(point, this.position);
    const distance = length(vector);
    if (distance < CAR_RADIUS + radius) {
      const normal = divide(vector, distance);
      const d = dot(this.velocity, normal);
      this.velocity = sub(this.velocity, multiply(normal, 2 * d));
      this.position = sub(point, multiply(vector, (CAR_RADIUS + radius) / distance));

      this.emit('collide');
    }
  }

  /**
   * @param {CanvasRenderingContext2D} context the canvas drawing context
   * @returns {void}
   */
  draw(context) {
    context.save();
    context.translate(this.position.x, this.position.y);

    // draw the username
    context.save();
    context.fillStyle = this.color;
    context.textAlign = 'center';
    context.font = '16px monospace';
    context.scale(1, -1);
    context.fillText(this.username, 0, -42);

    context.fillStyle = 'red';
    context.fillRect(-40, 40, this.health * 0.8, 4);
    context.restore();

    context.rotate(this.angle);

    // draw the body
    context.strokeStyle = this.color;

    // todo: car svg asf
    context.stroke(new Path2D(this.bodyPath));

    if (process.env.NODE_ENV !== 'production') {
      context.beginPath();
      context.arc(0, 0, CAR_RADIUS, 0, 2 * Math.PI);
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
   * @param {Wheel} wheel the wheel to draw
   * @param {CanvasRenderingContext2D} context the canvas drawing context
   * @returns {void}
   */
  drawWheel(wheel, context) {
    context.save();
    context.translate(wheel.position.x, wheel.position.y);
    context.rotate(wheel.angle);
    context.rect(-this.wheelDiameter / 2, -this.wheelWidth / 2, this.wheelDiameter, this.wheelWidth);

    context.restore();
  }

  /**
   * @param {Bullet} bullet the bullet to draw
   * @param {CanvasRenderingContext2D} context the canvas drawing context
   * @returns {void}
   */
  static drawBullet(bullet, context) {
    context.fillStyle = 'white';
    context.fillRect(bullet.position.x, bullet.position.y, 2, 2);
  }

  /**
   * @param {number} currentSimStep the current simulation step
   * @returns {void}
   */
  checkHistory(currentSimStep) {
    if (process.env.NODE_ENV !== 'production') {
      if (this.histories.length > 0) {
        const firstHistory = this.histories[0];
        const lastHistory = this.histories[this.histories.length - 1];

        // the histories must be in order and no steps should be skipped
        let simStep = firstHistory.simStep;
        for (let i = 1; i < this.histories.length; i += 1) {
          simStep += 1;
          if (this.histories[i].simStep !== simStep) {
            console.error(`[${currentSimStep}] ${this.username} - ${this.histories.map((h) => h.simStep).join(', ')}`);
            throw new Error(`[${currentSimStep}] ${this.username} - Histories are missing or out of order`);
          }
        }

        // the last history simulation step should be the current simulation step
        if (lastHistory.simStep !== currentSimStep) {
          console.error(`[${currentSimStep}] ${this.username} - ${this.histories.map((h) => h.simStep).join(', ')}`);
          throw new Error(`[${currentSimStep}] ${this.username} - The last history is incorrect`);
        }
      }
    }
  }
};
