const { add, atan, dot, multiply, rotate } = require('mathjs');

const tween = (currentValue, targetValue, step) => {
  let newValue = currentValue;
  if (currentValue > targetValue) {
    newValue = currentValue - step;
    if (newValue < targetValue) {
      newValue = targetValue;
    }
  } else if (currentValue < targetValue) {
    newValue = currentValue + step;
    if (newValue > targetValue) {
      newValue = targetValue;
    }
  }
  return newValue;
};

const WHEEL_FL = 0;
const WHEEL_FR = 1;
const WHEEL_RL = 2;
const WHEEL_RR = 3;

const DT = 0.016;

exports.Car = class {
  constructor(id) {
    this.id = id;

    this.history = [];

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
    this.momentOfInertia = this.mass * (this.wheelbase * this.wheelbase + this.track * this.track) / 12;

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

  input(event, currentSimStep) {
    // go back in history to find when the input should be applied
    // apply the input
    // step forward until now
    this.steerDirection = event.steerDirection === undefined ? this.steerDirection : event.steerDirection;
    this.accelerate = event.accelerate === undefined ? this.accelerate : event.accelerate;
    this.brake = event.brake === undefined ? this.brake : event.brake;
  }

  update() {
    this.history.push({
      position: this.position,
      angle: this.angle,
      velocity: this.velocity,
      angularVelocity: this.angularVelocity,
      steerDirection: this.steerDirection,
      accelerate: this.accelerate,
      brake: this.brake,
      wheels: this.wheels.map((wheel) => ({ ...wheel }))
    });

    // make sure it never gets too long
    if (this.history.length > 100) {
      this.history.shift();
    }

    // steer the wheels
    // ackerman https://datagenetics.com/blog/december12016/index.html
    let targetLeftAngle = 0;
    let targetRightAngle = 0;
    if (this.steerDirection !== 0) {
      const turnRadius = 80;
      targetLeftAngle = this.steerDirection * atan(this.wheelbase / (turnRadius + this.steerDirection * this.track / 2));
      targetRightAngle = this.steerDirection * atan(this.wheelbase / (turnRadius - this.steerDirection * this.track / 2));
    }

    this.wheels[WHEEL_FL].angle = tween(this.wheels[WHEEL_FL].angle, targetLeftAngle, 4 * DT);
    this.wheels[WHEEL_FR].angle = tween(this.wheels[WHEEL_FR].angle, targetRightAngle, 4 * DT);

    // todo: power curve
    // todo: reverse
    const wheelForce = this.accelerate ? 300 : 0;

    // calculate the acceleration
    let acceleration = [0, 0];
    let angularAcceleration = 0;
    this.wheels.forEach((wheel) => {
      const wheelPosition = rotate(wheel.position, this.angle);
      const wheelVelocity = add(this.velocity, multiply([-wheelPosition[1], wheelPosition[0]], this.angularVelocity));

      // power
      let force = rotate([wheelForce, 0], this.angle + wheel.angle);

      // brake
      const longitudinalFrictionConstant = this.brake ? 0.9 : 0.1;
      const longitudinalNormal = rotate([1, 0], this.angle + wheel.angle);
      const longitudinalVelocity = multiply(dot(longitudinalNormal, wheelVelocity), longitudinalNormal);
      const longitudinalFrictionForce = multiply(longitudinalVelocity, -longitudinalFrictionConstant);
      force = add(force, longitudinalFrictionForce);

      // slide
      const lateralFrictionConstant = 0.9;
      const lateralNormal = rotate([0, 1], this.angle + wheel.angle);
      const lateralVelocity = multiply(dot(lateralNormal, wheelVelocity), lateralNormal);
      const lateralFrictionForce = multiply(lateralVelocity, -lateralFrictionConstant);
      force = add(force, lateralFrictionForce);

      acceleration = add(acceleration, multiply(force, this.mass));
      angularAcceleration = add(angularAcceleration, (wheelPosition[0] * force[1] - wheelPosition[1] * force[0]) / this.momentOfInertia);
    });

    // update velocity with new forces
    this.velocity = add(this.velocity, multiply(acceleration, DT));
    this.angularVelocity = add(this.angularVelocity, multiply(angularAcceleration, DT));

    // update position with velocity
    this.position = add(this.position, multiply(this.velocity, DT));
    this.angle = add(this.angle, multiply(this.angularVelocity, DT));
  }

  draw(context) {
    context.save();

    context.translate(this.position[0], this.position[1]);
    context.rotate(this.angle);
    this.wheels.forEach((wheel) => this.drawWheel(wheel, context));

    context.restore();
  }

  drawWheel(wheel, context) {
    context.save();

    context.translate(wheel.position[0], wheel.position[1]);
    context.rotate(wheel.angle);
    context.fillStyle = 'white';
    context.fillRect(-this.wheelDiameter / 2, -this.wheelWidth / 2, this.wheelDiameter, this.wheelWidth);

    context.restore();
  }
}
