/**
 * @typedef { import("./vector").Point2 } Point2
 * @typedef {{ position: Point2, angle: number }} Wheel
 * @typedef {{ position: Point2, velocity: Point2, startSimStep: number }} Bullet
 *
 * @typedef {{ username: string, color: string }} JoinEvent
 * @typedef {{ username: string; score: number; }[]} ScoreboardEvent
 * @typedef {{ id: string; score: number; }} ScoreEvent
 * @typedef {{ id: string; health: number; }} HealthEvent
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
 *      steerDirection: number,
 *      accelerate: boolean,
 *      brake: boolean,
 *      shoot: boolean,
 *      wheels: Wheel[],
 *      bullets: Bullet[],
 * }} UpdateEvent
 */

/**
 * @typedef {{
 *      id: string,
 *      simStep: number,
 *      steerDirection?: number,
 *      accelerate?: boolean,
 *      brake?: boolean,
 *      shoot?: boolean
 * }} InputEvent
 */

/**
 * @param {InputEvent} inputEvent
 * @returns {ArrayBuffer}
 */
exports.serializeInputEvent = (inputEvent) => {
  const buffer = new ArrayBuffer(37);
  const idView = new Uint8Array(buffer, 0, 36);
  const simStepView = new Uint32Array(buffer, 36, 1);

  for (let i = 0; i < 36; i += 1) {
    idView[i] = inputEvent.id.charCodeAt(i);
  }

  simStepView[0] = inputEvent.simStep;

  return buffer;
};

// /**
//  * @param {ArrayBuffer} buffer
//  * @returns {InputEvent}
//  */
// exports.deserializeInputEvent = (buffer) => {
//   const idView = new Uint8Array(buffer, 0, 36);
//   const simStepView = new Uint32Array(buffer, 36, 1);

//   const id = String.fromCharCode(idView.to);
//   // for (let i = 0; i < 36; i += 1) {
//     // id[i] = String.fromCharCode(idView);
//   // }

//   return {};
// };
