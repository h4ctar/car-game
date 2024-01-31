export type Point2 = {
    x: number;
    y: number;
};

export type Box = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export const add = (a: Point2, b: Point2) => ({
    x: a.x + b.x,
    y: a.y + b.y,
});

/**
 * Subtract one point from another.
 */
export const sub = (a: Point2, b: Point2) => ({
    x: a.x - b.x,
    y: a.y - b.y,
});

/**
 * Multiply a vector by a scalar.
 */
export const multiply = (v: Point2, s: number) => ({
    x: v.x * s,
    y: v.y * s,
});

/**
 * Divide a vector by a scalar.
 */
export const divide = (v: Point2, s: number) => ({
    x: v.x / s,
    y: v.y / s,
});

/**
 * Calculate the dot product.
 */
export const dot = (a: Point2, b: Point2) => a.x * b.x + a.y * b.y;

/**
 * Rotate a vector by an angle.
 */
export const rotate = (v: Point2, a: number) => ({
    x: Math.cos(a) * v.x - Math.sin(a) * v.y,
    y: Math.sin(a) * v.x + Math.cos(a) * v.y,
});

/**
 * Calculate the length of a vector.
 */
export const length = (v: Point2) => Math.sqrt(v.x * v.x + v.y * v.y);

/**
 * Check if a box contains a point.
 */
export const contains = (b: Box, v: Point2) =>
    v.x > b.x && v.x < b.x + b.width && v.y > b.y && v.y < b.y + b.height;

/**
 * Check if two boxes intersect.
 */
export const intersects = (a: Box, b: Box) =>
    !(
        a.x + a.width < b.x ||
        b.x + b.width < a.x ||
        a.y + a.height < b.y ||
        b.y + b.height < a.y
    );

/**
 * Grow a box.
 */
export const grow = (b: Box, s: number) => ({
    x: b.x - s,
    y: b.y - s,
    width: b.width + 2 * s,
    height: b.height + 2 * s,
});
