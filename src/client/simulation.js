const { Simulation } = require('../common/simulation');
const { checkInput } = require('./input');

exports.ClientSimulation = class ClientSimulation extends Simulation {
  constructor() {
    super();

    this.myCar = undefined;
  }

  loop() {
    if (this.myCar) {
      checkInput(this.myCar, this.simStep);
    }

    super.loop();
  }
};
