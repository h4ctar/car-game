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
 * @typedef {{
 *      simStep: number,
 *      position: Point2,
 *      angle: number,
 *      velocity: Point2,
 *      angularVelocity: number,
 *      wheels: Wheel[],
 * }} CarHistory
 *
 * @typedef {{ username: string, color: string }} JoinEvent
 * @typedef {{ username: string; score: number; color: string }[]} Scoreboard
 * @typedef {{ id: string; score: number; }} ScoreEvent
 * @typedef {{ id: string; health: number; }} HealthEvent
 * @typedef {{ pingTime: number; }} PingEvent
 * @typedef {{ pongTime: number; } & PingEvent} PongEvent
 *
 * @typedef {{
 *      id: string;
 *      username: string,
 *      color: string,
 *      histories: CarHistory[],
 *      score: number,
 *      health: number,
 *      position: Point2,
 *      angle: number,
 *      velocity: Point2,
 *      angularVelocity: number,
 *      wheels: Wheel[],
 * }} UpdateEvent
 *
 * @typedef {{
 *      id: string,
 *      simStep: number,
 *      steer?: number,
 *      accelerate?: number,
 *      brake?: boolean,
 *      shoot?: boolean,
 * }} CarInputEvent
 */

exports.a = undefined;
