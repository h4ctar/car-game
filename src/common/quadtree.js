/**
 * @typedef {import("./vector").Point2} Point2
 * @typedef {import("./vector").Box} Box
 *
 */

const { contains, intersects } = require('./vector');

const MAX_POINTS = 8;

exports.TREE = 0;

exports.Quadtree = class Quadtree {
  /**
    * @typedef {{
    *   type: number,
    *   point: Point2,
    *   data: any,
    *   parent: Quadtree,
    * }} PointRef
    */

  /**
   * @param {Box} boundary
   */
  constructor(boundary) {
    /** @type {Quadtree[]} */
    this._children = [];

    /** @type {PointRef[]} */
    this._pointRefs = [];

    /** @type {Box} */
    this._boundary = boundary;
  }

  /**
   * Insert a point.
   * Returns the quadtree that the point was added to.
   * @param {number} type
   * @param {Point2} point
   * @param {any} data
   * @return {PointRef}
   */
  insert(type, point, data) {
    if (!contains(this._boundary, point)) {
      return undefined;
    }

    if (this._children.length === 0 && this._pointRefs.length < MAX_POINTS) {
      const pointRef = {
        type,
        point,
        data,
        parent: this,
      };
      this._pointRefs.push(pointRef);
      return pointRef;
    }

    if (this._children.length === 0) {
      this.subdivide();
    }

    for (const child of this._children) {
      const pointRef = child.insert(type, point, data);
      if (pointRef) {
        return pointRef;
      }
    }

    return undefined;
  }

  /**
   * @param {PointRef} pointRef
   */
  remove(pointRef) {
    if (pointRef.parent === this) {
      const index = this._pointRefs.indexOf(pointRef);
      this._pointRefs.splice(index, 1);
    } else {
      pointRef.parent.remove(pointRef);
    }
  }

  // move(pointRef, ) {

  // }

  /**
   * Query for all points in a range.
   * @param {number} type
   * @param {Box} range the range to check
   */
  query(type, range) {
    /** @type {PointRef[]} */
    const pointsInRange = [];

    if (!intersects(this._boundary, range)) {
      return pointsInRange;
    }

    const pointRefs = this._pointRefs
      .filter((pointRef) => pointRef.type === type)
      .filter((pointRef) => contains(range, pointRef.point));
    pointsInRange.push(...pointRefs);

    this._children.forEach((child) => pointsInRange.push(...child.query(type, range)));

    return pointsInRange;
  }

  subdivide() {
    this._children.push(new Quadtree({
      x: this._boundary.x,
      y: this._boundary.y,
      width: this._boundary.width / 2,
      height: this._boundary.height / 2,
    }));

    this._children.push(new Quadtree({
      x: this._boundary.x + this._boundary.width / 2,
      y: this._boundary.y,
      width: this._boundary.width / 2,
      height: this._boundary.height / 2,
    }));

    this._children.push(new Quadtree({
      x: this._boundary.x,
      y: this._boundary.y + this._boundary.height / 2,
      width: this._boundary.width / 2,
      height: this._boundary.height / 2,
    }));

    this._children.push(new Quadtree({
      x: this._boundary.x + this._boundary.width / 2,
      y: this._boundary.y + this._boundary.height / 2,
      width: this._boundary.width / 2,
      height: this._boundary.height / 2,
    }));
  }
};
