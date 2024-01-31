import { Point2 } from "./vector";

export type Wheel = {
    position: Point2;
    angle: number;
};

export type Bullet = {
    position: Point2;
    velocity: Point2;
    startSimStep: number;
};

export type CarHistory = {
    simStep: number;
    position: Point2;
    angle: number;
    velocity: Point2;
    angularVelocity: number;
    wheels: Wheel[];
};

export type JoinEvent = { username: string; color: string };
export type Scoreboard = { username: string; score: number; color: string }[];
export type ScoreEvent = { id: string; score: number };
export type HealthEvent = { id: string; health: number };
export type PingEvent = { pingTime: number };
export type PongEvent = { pongTime: number } & PingEvent;

export type UpdateEvent = {
    id: string;
    username: string;
    color: string;
    histories: CarHistory[];
    score: number;
    health: number;
    position: Point2;
    angle: number;
    velocity: Point2;
    angularVelocity: number;
    wheels: Wheel[];
};

export type CarInputEvent = {
    id: string;
    simStep: number;
    steer?: number;
    accelerate?: number;
    brake?: boolean;
    shoot?: boolean;
};
