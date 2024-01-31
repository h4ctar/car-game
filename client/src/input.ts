import { CarInputEvent, clamp, config } from "@cargame/common";
import { Car } from "@cargame/common/lib/car";
import { myId } from "./id";
import { socket } from "./socket";

const keys = new Array(256).fill(false);

/** @type {{xAxis: number, yAxis: number, shoot: boolean}} */
const touchpad = {
    xAxis: 0,
    yAxis: 0,
    shoot: false,
};

const isTouchCapable = "ontouchstart" in window;

const joystick = $("#joystick");
const stick = $("#stick");
const shootButton = $("#shoot-button");

if (isTouchCapable) {
    // @ts-ignore
    stick.on("touchmove", (event: TouchEvent) => {
        const stickCenterX =
            joystick.prop("offsetLeft") +
            stick.prop("offsetLeft") +
            stick.width()! / 2;
        const stickCenterY =
            joystick.prop("offsetTop") +
            stick.prop("offsetTop") +
            stick.height()! / 2;
        const stickDeltaX = clamp(
            event.touches[0].clientX - stickCenterX,
            -64,
            64,
        );
        const stickDeltaY = clamp(
            event.touches[0].clientY - stickCenterY,
            -64,
            64,
        );
        touchpad.xAxis = -stickDeltaX / 64;
        touchpad.yAxis = -stickDeltaY / 64;
        stick.css("transform", `translate(${stickDeltaX}px, ${stickDeltaY}px)`);
    });
    stick.on("touchend", () => {
        touchpad.xAxis = 0;
        touchpad.yAxis = 0;
        stick.css("transform", "translate(0px, 0px)");
    });

    shootButton.on("touchstart", () => {
        touchpad.shoot = true;
    });
    shootButton.on("touchend", () => {
        touchpad.shoot = false;
    });
} else {
    joystick.hide();
    shootButton.hide();

    window.onkeydown = (event) => {
        keys[event.which] = true;
    };
    window.onkeyup = (event) => {
        keys[event.which] = false;
    };
}

/**
 * @param car the car to process the input
 * @param simStep the current simulation step
 */
export const checkInput = (car: Car, simStep: number) => {
    if (car) {
        const event: CarInputEvent = {
            id: myId,
            simStep,
        };

        if (isTouchCapable) {
            event.steer = Math.round(touchpad.xAxis * config.STEER_RESOLUTION);
        } else if (keys[65]) {
            event.steer = config.STEER_RESOLUTION;
        } else if (keys[68]) {
            event.steer = -config.STEER_RESOLUTION;
        } else {
            event.steer = 0;
        }

        event.accelerate = keys[87]
            ? 1
            : touchpad.yAxis > 0
              ? touchpad.yAxis
              : 0;
        event.accelerate =
            Math.round(event.accelerate * config.ACCELERATE_RESOLUTION) /
            config.ACCELERATE_RESOLUTION;
        event.brake = keys[83] || touchpad.yAxis < -0.1;
        event.shoot = keys[32] || touchpad.shoot;

        const currentInput = car.lastInput();
        const dirty =
            event.steer !== currentInput.steer ||
            event.accelerate !== currentInput.accelerate ||
            event.brake !== currentInput.brake ||
            event.shoot !== currentInput.shoot;

        if (dirty) {
            car.processInput(event, simStep);
            socket.emit("input", event);
        }
    }
};
