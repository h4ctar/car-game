const math = require('mathjs');
const { DT } = require('./config');

exports.Bullet = class {
  constructor(position, velocity, startSimStep) {
    this.position = position;
    this.velocity = velocity;
    this.startSimStep = startSimStep;
  }

  isAlive(currentSimStep) {
    return currentSimStep - this.shootTime < 50;
  }

  update() {
    this.position = math.add(this.position, math.multiply(this.velocity, DT));
  }

  draw(context) {
    context.fillStyle = 'white';
    context.fillRect(this.position[0], this.position[1], 4, 4);
  }
};
