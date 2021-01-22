const math = require('mathjs');
const util = require('./util');
const { DT } = require('./config');

const WHEEL_FL = 0;
const WHEEL_FR = 1;
const WHEEL_RL = 2;
const WHEEL_RR = 3;

exports.Car = class Car {
  /**
   * @param {string} id
   * @param {string} username
   */
  constructor(id, username) {
    this.id = id;
    this.username = username;

    this.histories = [];
    this.inputEvents = [];

    this.score = 0;
    this.health = 100;

    this.position = [0, 0];
    this.angle = 0;
    this.velocity = [1, 0];
    this.angularVelocity = 0;
    this.steerDirection = 0;
    this.accelerate = false;
    this.brake = false;
    this.shoot = false;
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

    this.bullets = [];
  }

  serialize() {
    return {
      id: this.id,
      username: this.username,
      histories: this.histories,

      score: this.score,
      health: this.health,
      position: this.position,
      angle: this.angle,
      velocity: this.velocity,
      angularVelocity: this.angularVelocity,
      steerDirection: this.steerDirection,
      accelerate: this.accelerate,
      brake: this.brake,
      shoot: this.shoot,
      wheels: this.wheels,
      bullets: this.bullets,
    };
  }

  deserialize(event, currentSimStep) {
    this.histories = event.histories;

    this.score = event.score;
    this.health = event.health;
    this.position = event.position;
    this.angle = event.angle;
    this.velocity = event.velocity;
    this.angularVelocity = event.angularVelocity;
    this.steerDirection = event.steerDirection;
    this.accelerate = event.accelerate;
    this.brake = event.brake;
    this.shoot = event.shoot;
    this.wheels = event.wheels;
    this.bullets = event.bullets;

    // todo: there are bugs here

    let lastHistory = this.histories[this.histories.length - 1];
    if (lastHistory) {
      // remove future history
      const historyToDeleteCount = lastHistory.simStep - currentSimStep;
      this.histories.splice(this.histories.length - historyToDeleteCount);
    }

    // write missing history
    lastHistory = this.histories[this.histories.length - 1];
    if (lastHistory) {
      for (let simStep = lastHistory.simStep + 1; simStep <= currentSimStep; simStep += 1) {
        this.update(simStep);
      }
    }

    // check that the history is good
    // lastHistory = this.histories[this.histories.length - 1];
    // if (lastHistory && lastHistory.simStep !== currentSimStep) {
    //   console.log(lastHistory, ',', currentSimStep);
    // }
  }

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
    } else {
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
      this.steerDirection = history.steerDirection;
      this.accelerate = history.accelerate;
      this.brake = history.brake;
      this.shoot = history.shoot;
      this.wheels = history.wheels.map((wheel) => ({ ...wheel }));
      this.bullets = history.bullets.map((bullet) => ({ ...bullet }));
    } else {
      console.warn(`No history at ${desiredSimStep}`);
    }
  }

  applyInput(event) {
    this.steerDirection = event.steerDirection === undefined ? this.steerDirection : event.steerDirection;
    this.accelerate = event.accelerate === undefined ? this.accelerate : event.accelerate;
    this.brake = event.brake === undefined ? this.brake : event.brake;
    this.shoot = event.shoot === undefined ? this.shoot : event.shoot;
  }

  /**
   * @param { number } simStep
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
      steerDirection: this.steerDirection,
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

    if (this.shoot) {
      // todo: reload timer
      const bulletSpeed = 1000;
      const bulletVelocity = math.add(this.velocity, math.rotate([bulletSpeed, 0], this.angle));
      const bullet = { position: this.position, velocity: bulletVelocity, startSimStep: simStep };
      this.bullets.push(bullet);
    }

    this.bullets = this.bullets.filter((bullet) => simStep - bullet.startSimStep < 50);
    this.bullets.forEach((bullet) => { bullet.position = math.add(bullet.position, math.multiply(bullet.velocity, DT)); });
  }

  /**
   * @param { CanvasRenderingContext2D } context
   */
  draw(context) {
    context.save();
    context.translate(this.position[0], this.position[1]);

    context.save();
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.scale(2, -2);
    context.fillText(this.username, 0, 40);
    context.restore();

    context.rotate(this.angle);
    this.wheels.forEach((wheel) => this.drawWheel(wheel, context));
    context.restore();

    this.bullets.forEach((bullet) => Car.drawBullet(bullet, context));
  }

  drawWheel(wheel, context) {
    context.save();
    context.translate(wheel.position[0], wheel.position[1]);
    context.rotate(wheel.angle);
    context.fillStyle = 'white';
    context.fillRect(-this.wheelDiameter / 2, -this.wheelWidth / 2, this.wheelDiameter, this.wheelWidth);

    context.restore();
  }

  static drawBullet(bullet, context) {
    context.fillStyle = 'white';
    context.fillRect(bullet.position[0], bullet.position[1], 4, 4);
  }
};
