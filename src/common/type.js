/* eslint-disable no-bitwise */
/**
 * @typedef { import("./vector").Point2 } Point2
 *
 * @typedef {{
 *    position: Point2,
 *    angle: number,
 * }} Wheel
 *
 * @typedef {{
 *    position: Point2,
 *    velocity: Point2,
 *    startSimStep: number,
 * }} Bullet
 *
 * @typedef {{ username: string, color: string }} JoinEvent
 * @typedef {{ username: string; score: number; }[]} ScoreboardEvent
 * @typedef {{ id: string; score: number; }} ScoreEvent
 * @typedef {{ id: string; health: number; }} HealthEvent
 *
 * @typedef {{
 *      id: string;
 *      username: string,
 *      color: string,
 *      histories: any[],
 *      inputEvents: InputEvent[],
 *      score: number,
 *      health: number,
 *      position: Point2,
 *      angle: number,
 *      velocity: Point2,
 *      angularVelocity: number,
 *      steer: number,
 *      accelerate: boolean,
 *      brake: boolean,
 *      shoot: boolean,
 *      wheels: Wheel[],
 *      bullets: Bullet[],
 * }} UpdateEvent
 *
 * @typedef {{
 *      id: string,
 *      simStep: number,
 *      steer?: number,
 *      accelerate?: boolean,
 *      brake?: boolean,
 *      shoot?: boolean,
 * }} InputEvent
 */

/**
 * @param {InputEvent} inputEvent
 * @returns {ArrayBuffer}
 */
exports.serializeInputEvent = (inputEvent) => {
  const buffer = new ArrayBuffer(45);

  const idView = new Uint8Array(buffer, 0, 36);
  for (let i = 0; i < 36; i += 1) {
    idView[i] = inputEvent.id.charCodeAt(i);
  }

  const simStepView = new Uint32Array(buffer, 36, 1);
  simStepView[0] = inputEvent.simStep;

  const steerView = new Int32Array(buffer, 40, 1);
  steerView[0] = inputEvent.steer;

  const booleanView = new Uint8Array(buffer, 44, 1);
  booleanView[0] = (inputEvent.accelerate && 0b00000001) | (inputEvent.brake && 0b00000010) | (inputEvent.shoot && 0b00000100);

  return buffer;
};

/**
 * @param {ArrayBuffer} buffer
 * @returns {InputEvent}
 */
exports.deserializeInputEvent = (buffer) => {
  const idView = new Uint8Array(buffer, 0, 36);
  const id = String.fromCodePoint(...idView);

  const simStepView = new Uint32Array(buffer, 36, 1);
  const simStep = simStepView[0];

  const steerView = new Int32Array(buffer, 40, 1);
  const steer = steerView[0];

  const booleanView = new Uint8Array(buffer, 44, 1);
  const accelerate = !!(booleanView[0] & 0b00000001);
  const brake = !!(booleanView[0] & 0b00000010);
  const shoot = !!(booleanView[0] & 0b00000100);

  return {
    id,
    simStep,
    steer,
    accelerate,
    brake,
    shoot,
  };
};
