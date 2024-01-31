import config from "./config";

export const tween = (
    currentValue: number,
    targetValue: number,
    step: number,
) => {
    let newValue = currentValue;
    if (currentValue > targetValue) {
        newValue = currentValue - step;
        if (newValue < targetValue) {
            newValue = targetValue;
        }
    } else if (currentValue < targetValue) {
        newValue = currentValue + step;
        if (newValue > targetValue) {
            newValue = targetValue;
        }
    }
    return newValue;
};

export const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

export const randomPoint = () => ({
    x: Math.random() * config.WORLD_WIDTH,
    y: Math.random() * config.WORLD_HEIGHT,
});
