/**
 * @typedef {{ x: number, y: number }} Point2
 */

/**
 * Add two points.
 * @param {Point2} a
 * @param {Point2} b
 */
exports.add = (a, b) => ({
  x: a.x + b.x,
  y: a.y + b.y,
});

/**
 * Subtract one point from another.
 * @param {Point2} a
 * @param {Point2} b
 */
exports.sub = (a, b) => ({
  x: a.x - b.x,
  y: a.y - b.y,
});

/**
 * Multiply a vector by a scalar.
 * @param {Point2} v the vector
 * @param {number} s the scalar
 */
exports.multiply = (v, s) => ({
  x: v.x * s,
  y: v.y * s,
});

/**
 * Calculate the dot product.
 * @param {Point2} a the first vector
 * @param {Point2} b the second vector
 */
exports.dot = (a, b) => a.x * b.x + a.y * b.y;

/**
 * Rotate a vector by an angle.
 * @param {Point2} v the vector
 * @param {number} a the angle
 */
exports.rotate = (v, a) => ({
  x: Math.cos(a) * v.x - Math.sin(a) * v.y,
  y: Math.sin(a) * v.x + Math.cos(a) * v.y,
});

/**
 * Calculate the length of a vector.
 * @param {Point2} v the vector
 */
exports.length = (v) => Math.sqrt(v.x * v.x + v.y * v.y);
