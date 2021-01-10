const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const context = canvas.getContext('2d');
context.translate(0, canvas.height);
context.scale(1, -1);

const keys = new Array(256);
window.onkeydown = (event) => { keys[event.which] = true; };
window.onkeyup = (event) => { keys[event.which] = false; };

const WHEEL_FL = 0;
const WHEEL_FR = 1;
const WHEEL_RL = 2;
const WHEEL_RR = 3;

class Wheel {
  constructor(position, diameter, width) {
    this.position = position;
    this.angle = 0;
    this.diameter = diameter;
    this.width = width;
    this.driveForce = 0;
  }

  draw() {
    context.save();

    context.translate(this.position[0], this.position[1]);
    context.rotate(this.angle);
    context.fillStyle = 'white';
    context.fillRect(-this.diameter / 2, -this.width / 2, this.diameter, this.width);

    context.restore();
  }
}

class Car {
  constructor(position) {
    this.position = position;
    this.angle = 0;
    this.velocity = [0, 0];
    this.angularVelocity = 0;
    this.steerDirection = 0;
    this.driveForce = 0;
    this.wheelbase = 50;
    this.track = 25;
    this.mass = 2;
    this.momentOfInertia = this.mass * (this.wheelbase * this.wheelbase + this.track * this.track) / 12;

    const wheelWidth = 8;
    const wheelDiameter = 16;
    this.wheels = new Array(4);
    this.wheels[WHEEL_FL] = new Wheel([this.wheelbase / 2, -this.track / 2], wheelDiameter, wheelWidth);
    this.wheels[WHEEL_FR] = new Wheel([this.wheelbase / 2, this.track / 2], wheelDiameter, wheelWidth);
    this.wheels[WHEEL_RL] = new Wheel([-this.wheelbase / 2, -this.track / 2], wheelDiameter, wheelWidth);
    this.wheels[WHEEL_RR] = new Wheel([-this.wheelbase / 2, this.track / 2], wheelDiameter, wheelWidth);
  }

  update(dt) {
    // steer the wheels
    // ackerman https://datagenetics.com/blog/december12016/index.html
    let targetLeftAngle = 0;
    let targetRightAngle = 0;
    if (this.steerDirection !== 0) {
      const turnRadius = 50;
      targetLeftAngle = this.steerDirection * Math.atan(this.wheelbase / (turnRadius + this.steerDirection * this.track / 2));
      targetRightAngle = this.steerDirection * Math.atan(this.wheelbase / (turnRadius - this.steerDirection * this.track / 2));
    }
    this.wheels[WHEEL_FL].angle += dt * (targetLeftAngle - this.wheels[WHEEL_FL].angle) / 0.2;
    this.wheels[WHEEL_FR].angle += dt * (targetRightAngle - this.wheels[WHEEL_FR].angle) / 0.2;

    // drive and braking force
    this.wheels[WHEEL_RL].driveForce = this.driveForce;
    this.wheels[WHEEL_RR].driveForce = this.driveForce;

    // calculate the acceleration
    let acceleration = [0, 0];
    let angularAcceleration = 0;
    this.wheels.forEach((wheel) => {
      const wheelPosition = math.rotate(wheel.position, this.angle);

      const driveForce = math.rotate([wheel.driveForce, 0], this.angle + wheel.angle);

      const wheelVelocity = math.add(this.velocity, math.multiply([-wheelPosition[1], wheelPosition[0]], this.angularVelocity));
      const lateralNormal = math.rotate([0, 1], this.angle + wheel.angle);
      const lateralVelocity = math.multiply(math.dot(lateralNormal, wheelVelocity), lateralNormal);
      const lateralFrictionForce = math.multiply(lateralVelocity, -0.8);

      const force = math.add(driveForce, lateralFrictionForce);

      acceleration = math.add(acceleration, math.multiply(force, this.mass));
      angularAcceleration = math.add(angularAcceleration, (wheelPosition[0] * force[1] - wheelPosition[1] * force[0]) / this.momentOfInertia);
    });

    // update velocity with new forces
    this.velocity = math.add(this.velocity, math.multiply(acceleration, dt));
    this.angularVelocity = math.add(this.angularVelocity, math.multiply(angularAcceleration, dt));

    // update position with velocity
    this.position = math.add(this.position, math.multiply(this.velocity, dt));
    this.angle = math.add(this.angle, math.multiply(this.angularVelocity, dt));
  }

  draw() {
    context.save();

    context.translate(this.position[0], this.position[1]);
    context.rotate(this.angle);
    this.wheels.forEach((wheel) => wheel.draw());

    context.restore();
  }
}

const car = new Car([200, 200]);

const loop = () => {
  if (keys[65]) {
    car.steerDirection = 1;
  } else if (keys[68]) {
    car.steerDirection = -1;
  } else {
    car.steerDirection = 0;
  }

  if (keys[87]) {
    car.driveForce = 300;
  } else if (keys[83]) {
    car.driveForce = -300;
  } else {
    car.driveForce = 0;
  }

  car.update(0.01);

  // clear
  context.fillStyle = 'black';
  context.fillRect(0, 0, canvas.width, canvas.height);

  car.draw();

  window.requestAnimationFrame(loop);
};

loop();
