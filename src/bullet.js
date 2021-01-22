const math = require('mathjs');
const { DT } = require('./config');

exports.Bullet = class {
  /**
   * @param { number[] } position
   * @param { number[] } velocity
   * @param { number } startSimStep
   */
  constructor(position, velocity, startSimStep) {
    this.position = position;
    this.velocity = velocity;
    this.startSimStep = startSimStep;
  }

  /**
   * @param { number } currentSimStep
   */
  isAlive(currentSimStep) {
    return currentSimStep - this.startSimStep < 50;
  }

  update() {
    this.position = math.add(this.position, math.multiply(this.velocity, DT));
  }

  /**
   * @param { CanvasRenderingContext2D } context
   */
  draw(context) {
    context.fillStyle = 'white';
    context.fillRect(this.position[0], this.position[1], 4, 4);
  }
};
