/**
 * @typedef { import('../common/car').Car } Car
 */

const infoCard = document.getElementById('info-card');
const scoreSpan = /** @type { HTMLSpanElement } */ (document.getElementById('score-span'));
const healthSpan = /** @type { HTMLSpanElement } */ (document.getElementById('health-span'));

exports.hideInfoCard = () => {
  infoCard.style.display = 'none';
};

/**
 *
 * @param {Car} car
 */
exports.updateInfoCard = (car) => {
  infoCard.style.display = 'block';
  scoreSpan.textContent = String(car.score);
  healthSpan.textContent = String(car.health);
};
