/**
 * @typedef { import("./vector").Point2 } Point2
 * @typedef { import("./type").Wheel } Wheel
 * @typedef { import("./type").Bullet } Bullet
 * @typedef { import("./type").InputEvent } InputEvent
 * @typedef { import("./type").UpdateEvent } UpdateEvent
 */

const util = require('./util');
const { DT, STEER_RESOLUTION } = require('./config');
const {
  add, multiply, dot, rotate, length,
} = require('./vector');

const WHEEL_FL = 0;
const WHEEL_FR = 1;
// const WHEEL_RL = 2;
// const WHEEL_RR = 3;

exports.Car = class Car extends EventTarget {
  /**
   * @param {string} id
   * @param {string} username
   * @param {string} color
   */
  constructor(id, username, color) {
    super();

    this.id = id;
    this.username = username;
    this.color = color;

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

    this.score = 0;
    this._health = 1000;

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
  }

  /**
   * Set the health.
   * @param {number} value
   */
  set health(value) {
    this._health = value;
    this.dispatchEvent(new Event('health'));
  }

  get health() {
    return this._health;
  }

  /**
   * Set the score.
   * @param {number} value
   */
  set score(value) {
    this._score = value;
    this.dispatchEvent(new Event('score'));
  }

  get score() {
    return this._score;
  }

  /**
   * @returns {UpdateEvent}
   */
  serialize() {
    return {
      id: this.id,
      username: this.username,
      color: this.color,

      histories: this.histories,
      inputEvents: this.inputEvents,

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
   * @param {UpdateEvent} event
   * @param {number} currentSimStep
   */
  deserialize(event, currentSimStep) {
    this.histories = event.histories;
    this.inputEvents = event.inputEvents;

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
      if (lastHistory.simStep + 1 > currentSimStep) {
        this.windBackTime(currentSimStep);
      } else if (lastHistory.simStep + 1 < currentSimStep) {
        let simStep = lastHistory.simStep;
        while (simStep < currentSimStep) {
          this.update(simStep);
          simStep += 1;
        }
      }
    }

    // check that the history is good
    // lastHistory = this.histories[this.histories.length - 1];
    // if (lastHistory && lastHistory.simStep !== currentSimStep) {
    //   console.log(lastHistory, ',', currentSimStep);
    // }
  }

  /**
   * @param {InputEvent} event
   * @param {number} currentSimStep
   */
  processInput(event, currentSimStep) {
    this.inputEvents.push(event);
    this.inputEvents.sort((a, b) => a.simStep - b.simStep);
    // only remember 10 input events
    this.inputEvents.splice(0, this.inputEvents.length - 10);

    if (event.simStep > currentSimStep) {
      // it's in the future, process it later
    } else if (event.simStep === currentSimStep) {
      // it's this update, process it now
      this.applyInput(event);
    } else if (this.histories.length > 0) {
      // it's in the past, wind back time
      this.windBackTime(event.simStep);

      // apply the input
      this.applyInput(event);

      // and step forward until now
      let simStep = event.simStep;
      while (simStep < currentSimStep) {
        this.update(simStep);
        simStep += 1;
      }
    } else {
      // there is no history
    }
  }

  /**
   * @param { number } desiredSimStep
   */
  windBackTime(desiredSimStep) {
    // find the point with desired simulation step
    let historyIndex = desiredSimStep - this.histories[0].simStep;
    if (historyIndex < 0) {
      historyIndex = 0;
    }
    const history = this.histories[historyIndex];

    if (history) {
      // remove history after this history point (including this point)
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
  }

  /**
   * @param {InputEvent} event
   */
  applyInput(event) {
    this.steer = event.steer;
    this.accelerate = event.accelerate;
    this.brake = event.brake;
    this.shoot = event.shoot;
  }

  /**
   * @param {number} simStep
   */
  update(simStep) {
    // process previously received inputs
    this.inputEvents
      .filter((event) => event.simStep === simStep)
      .forEach((event) => this.processInput(event, simStep));

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

    // todo: power curve
    // todo: reverse
    const wheelForce = this.accelerate ? 80 : 0;

    // calculate the acceleration
    let acceleration = { x: 0, y: 0 };
    let angularAcceleration = 0;
    this.wheels.forEach((wheel) => {
      const wheelPosition = rotate(wheel.position, this.angle);
      const wheelVelocity = add(this.velocity, multiply({ x: -wheelPosition.y, y: wheelPosition.x }, this.angularVelocity));

      // power
      let force = rotate({ x: wheelForce, y: 0 }, this.angle + wheel.angle);

      // brake
      const longitudinalFrictionConstant = this.brake ? 0.9 : 0.1;
      const longitudinalNormal = rotate({ x: 1, y: 0 }, this.angle + wheel.angle);
      const longitudinalVelocity = multiply(longitudinalNormal, dot(longitudinalNormal, wheelVelocity));
      const longitudinalFrictionForce = multiply(longitudinalVelocity, -longitudinalFrictionConstant);
      force = add(force, longitudinalFrictionForce);

      // slide
      const lateralFrictionConstant = 1;
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
  }

  /**
   * @param {CanvasRenderingContext2D} context
   */
  draw(context) {
    context.save();
    context.translate(this.position.x, this.position.y);

    // draw the username
    context.save();
    context.fillStyle = this.color;
    context.textAlign = 'center';
    context.scale(1, -1);
    context.fillText(this.username, 0, 60);
    context.restore();

    context.rotate(this.angle);

    // draw the body
    context.strokeStyle = this.color;
    context.stroke(new Path2D(this.bodyPath));

    // draw the wheels
    context.beginPath();
    context.strokeStyle = this.color;
    this.wheels.forEach((wheel) => this.drawWheel(wheel, context));
    context.stroke();

    context.restore();

    this.bullets.forEach((bullet) => Car.drawBullet(bullet, context));
  }

  /**
   * @param {Wheel} wheel
   * @param {CanvasRenderingContext2D} context
   */
  drawWheel(wheel, context) {
    context.save();
    context.translate(wheel.position.x, wheel.position.y);
    context.rotate(wheel.angle);
    context.rect(-this.wheelDiameter / 2, -this.wheelWidth / 2, this.wheelDiameter, this.wheelWidth);

    context.restore();
  }

  /**
   * @param {Bullet} bullet
   * @param {CanvasRenderingContext2D} context
   */
  static drawBullet(bullet, context) {
    context.fillStyle = 'white';
    context.fillRect(bullet.position.x, bullet.position.y, 2, 2);
  }
};
