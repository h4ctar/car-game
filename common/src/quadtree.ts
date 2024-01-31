import { Box, Point2, contains, intersects } from "./vector";

const MAX_POINTS = 8;

export type PointRef = {
    type: number;
    point: Point2;
    id?: number;
    data?: any;
    parent: Quadtree;
};

export class Quadtree {
    private _children: Quadtree[] = [];
    private _pointRefs: PointRef[] = [];
    private _pointRefMap: { [key: number]: PointRef } = {};
    private _boundary: Box;

    /**
     * @param boundary the boundary of the quadtree
     */
    constructor(boundary: Box) {
        this._boundary = boundary;
    }

    /**
     * Insert a point.
     * @param type the type of the point to add
     * @param point the points position
     * @param id the ID of the point
     * @param data any data
     * @return the point ref of the newly added point, or undefined if it could not be added
     */
    public insert(
        type: number,
        point: Point2,
        id: number,
        data?: any,
    ): PointRef | undefined {
        if (!contains(this._boundary, point)) {
            return;
        }

        if (
            this._children.length === 0 &&
            this._pointRefs.length < MAX_POINTS
        ) {
            const pointRef = {
                type,
                point,
                id,
                data,
                parent: this,
            };
            this._pointRefs.push(pointRef);
            this._pointRefMap[id] = pointRef;
            return pointRef;
        }

        if (this._children.length === 0) {
            this.subdivide();
        }

        for (const child of this._children) {
            const pointRef = child.insert(type, point, data, undefined);
            if (pointRef) {
                pointRef.id = id;
                this._pointRefMap[id] = pointRef;
                return pointRef;
            }
        }

        return undefined;
    }

    /**
     * @param pointRef the point ref or ID of point to remove
     * @returns true if it was removed
     */
    public remove(pointRef: PointRef | number): boolean {
        if (typeof pointRef === "number") {
            pointRef = this._pointRefMap[pointRef];

            if (!pointRef) {
                return false;
            }
        }

        if (pointRef.parent === this) {
            const index = this._pointRefs.indexOf(pointRef);
            this._pointRefs.splice(index, 1);
            return true;
        }

        return pointRef.parent.remove(pointRef);
    }

    /**
     * Query for all points in a range.
     * @param  type the type of point to look for
     * @param  range the range to check
     * @returns  the found points
     */
    query(type: number, range: Box): PointRef[] {
        const pointsInRange: PointRef[] = [];

        if (!intersects(this._boundary, range)) {
            return pointsInRange;
        }

        const pointRefs = this._pointRefs
            .filter((pointRef) => pointRef.type === type)
            .filter((pointRef) => contains(range, pointRef.point));
        pointsInRange.push(...pointRefs);

        this._children.forEach((child) =>
            pointsInRange.push(...child.query(type, range)),
        );

        return pointsInRange;
    }

    subdivide() {
        this._children.push(
            new Quadtree({
                x: this._boundary.x,
                y: this._boundary.y,
                width: this._boundary.width / 2,
                height: this._boundary.height / 2,
            }),
        );

        this._children.push(
            new Quadtree({
                x: this._boundary.x + this._boundary.width / 2,
                y: this._boundary.y,
                width: this._boundary.width / 2,
                height: this._boundary.height / 2,
            }),
        );

        this._children.push(
            new Quadtree({
                x: this._boundary.x,
                y: this._boundary.y + this._boundary.height / 2,
                width: this._boundary.width / 2,
                height: this._boundary.height / 2,
            }),
        );

        this._children.push(
            new Quadtree({
                x: this._boundary.x + this._boundary.width / 2,
                y: this._boundary.y + this._boundary.height / 2,
                width: this._boundary.width / 2,
                height: this._boundary.height / 2,
            }),
        );
    }
}
