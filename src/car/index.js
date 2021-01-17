const math = require('mathjs');
const PIXI = typeof window === 'undefined' ? undefined : require('pixi.js');
const util = require('../util');

const WHEEL_FL = 0;
const WHEEL_FR = 1;
const WHEEL_RL = 2;
const WHEEL_RR = 3;

const DT = 0.016;

exports.Car = class {
  constructor(id) {
    this.id = id;

    this.histories = [];
    this.futureInputs = [];

    this.position = [0, 0];
    this.angle = 0;
    this.velocity = [0, 0];
    this.angularVelocity = 0;
    this.steerDirection = 0;
    this.accelerate = false;
    this.brake = false;
    this.wheelbase = 50;
    this.track = 25;
    this.mass = 2;
    this.momentOfInertia = (this.mass / 12) * (this.wheelbase * this.wheelbase + this.track * this.track);

    this.wheelWidth = 8;
    this.wheelDiameter = 16;

    this.wheels = new Array(4);
    this.wheels[WHEEL_FL] = {
      position: [this.wheelbase / 2, -this.track / 2],
      angle: 0,
    };
    this.wheels[WHEEL_FR] = {
      position: [this.wheelbase / 2, this.track / 2],
      angle: 0,
    };
    this.wheels[WHEEL_RL] = {
      position: [-this.wheelbase / 2, -this.track / 2],
      angle: 0,
    };
    this.wheels[WHEEL_RR] = {
      position: [-this.wheelbase / 2, this.track / 2],
      angle: 0,
    };
  }

  processInput(event, currentSimStep) {
    if (event.simStep > currentSimStep) {
      console.warn(`received future event ${event.simStep} ${currentSimStep}`);

      this.futureInputs.push(event);
    } else if (event.simStep === currentSimStep) {
      this.steerDirection = event.steerDirection === undefined ? this.steerDirection : event.steerDirection;
      this.accelerate = event.accelerate === undefined ? this.accelerate : event.accelerate;
      this.brake = event.brake === undefined ? this.brake : event.brake;
    } else {
      // go back in history to find when the input should be applied
      // note: when an input event comes in it will clobber previous input events that have a later sim step
      // todo: make this more effecient (does not need to loop, can calculate the index)
      let historyIndex = this.histories.findIndex((history) => history.simStep === event.simStep);

      if (historyIndex === -1) {
        console.warn(`received old event ${event.simStep} ${currentSimStep}`);
        historyIndex = 0;
      }

      const history = this.histories[historyIndex];

      // remove history after this history point (including this point)
      this.histories.splice(historyIndex);

      // reset this to the history point
      this.position = history.position;
      this.angle = history.angle;
      this.velocity = history.velocity;
      this.angularVelocity = history.angularVelocity;
      this.steerDirection = history.steerDirection;
      this.accelerate = history.accelerate;
      this.brake = history.brake;
      this.wheels = history.wheels.map((wheel) => ({ ...wheel }));

      // apply the input
      this.steerDirection = event.steerDirection === undefined ? this.steerDirection : event.steerDirection;
      this.accelerate = event.accelerate === undefined ? this.accelerate : event.accelerate;
      this.brake = event.brake === undefined ? this.brake : event.brake;

      // step forward until now
      let { simStep } = history;
      while (simStep < currentSimStep) {
        this.update(simStep);
        simStep += 1;
      }
    }
  }

  update(simStep) {
    // todo: instead of this ugly only put input for events that are good
    // also, make sure they go in the correct order
    const futureInputs = [...this.futureInputs];
    this.futureInputs.length = 0;
    futureInputs.forEach((event) => this.processInput(event, simStep));

    // add history to start of histories queue
    this.histories.push({
      simStep,
      position: this.position,
      angle: this.angle,
      velocity: this.velocity,
      angularVelocity: this.angularVelocity,
      steerDirection: this.steerDirection,
      accelerate: this.accelerate,
      brake: this.brake,
      wheels: this.wheels.map((wheel) => ({ ...wheel })),
    });

    // make sure it never gets too long
    while (this.histories.length > 100) {
      // remove history from the end of the queue
      this.histories.shift();
    }

    // steer the wheels
    // ackerman https://datagenetics.com/blog/december12016/index.html
    let targetLeftAngle = 0;
    let targetRightAngle = 0;
    if (this.steerDirection !== 0) {
      const speed = Math.sqrt(this.velocity[0] * this.velocity[0] + this.velocity[1] * this.velocity[1]);
      // bigger turn radius when going faster
      const turnRadius = util.clamp(speed, 0, 1500) / 1500 * 300 + 40;
      targetLeftAngle = this.steerDirection * math.atan(this.wheelbase / (turnRadius + this.steerDirection * this.track / 2));
      targetRightAngle = this.steerDirection * math.atan(this.wheelbase / (turnRadius - this.steerDirection * this.track / 2));
    }

    this.wheels[WHEEL_FL].angle = util.tween(this.wheels[WHEEL_FL].angle, targetLeftAngle, 4 * DT);
    this.wheels[WHEEL_FR].angle = util.tween(this.wheels[WHEEL_FR].angle, targetRightAngle, 4 * DT);

    // todo: power curve
    // todo: reverse
    const wheelForce = this.accelerate ? 200 : 0;

    // calculate the acceleration
    let acceleration = [0, 0];
    let angularAcceleration = 0;
    this.wheels.forEach((wheel) => {
      const wheelPosition = math.rotate(wheel.position, this.angle);
      const wheelVelocity = math.add(this.velocity, math.multiply([-wheelPosition[1], wheelPosition[0]], this.angularVelocity));

      // power
      let force = math.rotate([wheelForce, 0], this.angle + wheel.angle);

      // brake
      const longitudinalFrictionConstant = this.brake ? 0.9 : 0.1;
      const longitudinalNormal = math.rotate([1, 0], this.angle + wheel.angle);
      const longitudinalVelocity = math.multiply(math.dot(longitudinalNormal, wheelVelocity), longitudinalNormal);
      const longitudinalFrictionForce = math.multiply(longitudinalVelocity, -longitudinalFrictionConstant);
      force = math.add(force, longitudinalFrictionForce);

      // slide
      const lateralFrictionConstant = 1;
      const lateralNormal = math.rotate([0, 1], this.angle + wheel.angle);
      const lateralVelocity = math.multiply(math.dot(lateralNormal, wheelVelocity), lateralNormal);
      const lateralFrictionForce = math.multiply(lateralVelocity, -lateralFrictionConstant);
      force = math.add(force, lateralFrictionForce);

      acceleration = math.add(acceleration, math.multiply(force, this.mass));
      angularAcceleration = math.add(angularAcceleration, (wheelPosition[0] * force[1] - wheelPosition[1] * force[0]) / this.momentOfInertia);
    });

    // update velocity with new forces
    this.velocity = math.add(this.velocity, math.multiply(acceleration, DT));
    this.angularVelocity = math.add(this.angularVelocity, math.multiply(angularAcceleration, DT));

    // update position with velocity
    this.position = math.add(this.position, math.multiply(this.velocity, DT));
    this.angle = math.add(this.angle, math.multiply(this.angularVelocity, DT));
  }

  draw(app) {
    if (!this.sprite) {
      this.sprite = new PIXI.Sprite(PIXI.utils.TextureCache['car.png']);
      this.sprite.width = this.wheelbase;
      this.sprite.height = this.track;
      this.sprite.anchor.x = 0.5;
      this.sprite.anchor.y = 0.5;
      app.stage.addChild(this.sprite);
    }

    this.sprite.position.set(this.position[0], app.view.height - this.position[1]);
    this.sprite.rotation = -this.angle;
  }

  remove(app) {
    if (this.sprite) {
      app.stage.removeChild(this.sprite);
      this.sprite = undefined;
    }
  }
};
