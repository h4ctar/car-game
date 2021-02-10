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
