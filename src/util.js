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

exports.uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  // eslint-disable-next-line no-bitwise, no-mixed-operators
  const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
});
