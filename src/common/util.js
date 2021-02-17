const { WORLD_WIDTH, WORLD_HEIGHT } = require('./config');

exports.tween = (currentValue, targetValue, step) => {
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

exports.clamp = (val, min, max) => Math.min(Math.max(val, min), max);

exports.randomPoint = () => ({
  x: Math.random() * WORLD_WIDTH,
  y: Math.random() * WORLD_HEIGHT,
});
