const math = require('mathjs');
const { DT } = require('./config');

exports.Bullet = class {
  constructor(position, velocity) {
    this.position = position;
    this.velocity = velocity;
    this.shootTime = Date.now();
  }

  isAlive() {
    return Date.now() - this.shootTime < 1000;
  }

  update() {
    this.position = math.add(this.position, math.multiply(this.velocity, DT));
  }

  draw(context) {
    context.fillStyle = 'white';
    context.fillRect(this.position[0], this.position[1], 4, 4);
  }
};
