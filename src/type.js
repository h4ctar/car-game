/**
 * @typedef { import("./vector").Point2 } Point2
 * @typedef {{ position: Point2, angle: number }} Wheel
 * @typedef {{ position: Point2, velocity: Point2, startSimStep: number }} Bullet
 *
 * @typedef {{ username: string }} JoinEvent
 * @typedef {{ id: string, simStep: number, steerDirection?: number, accelerate?: boolean, brake?: boolean, shoot?: boolean }} InputEvent
 * @typedef {{ username: string; score: number; }[]} ScoreboardEvent
 * @typedef {{ id: string; score: number; }} ScoreEvent
 * @typedef {{ id: string; health: number; }} HealthEvent
 * @typedef {{
 *      id: string;
 *      username: string,
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

exports.a = {};
