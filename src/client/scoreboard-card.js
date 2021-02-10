/**
 * @typedef { import('../common/type').ScoreboardEvent } ScoreboardEvent
 */

const { SCOREBOARD_LENGTH } = require('../common/config');
const { socket } = require('./socket');

const scoreboardTableBody = /** @type { HTMLTableSectionElement } */ (document.getElementById('scoreboard-tbody'));
for (let i = 1; i <= SCOREBOARD_LENGTH; i += 1) {
  const row = scoreboardTableBody.insertRow();
  row.insertCell().textContent = String(i);
  row.insertCell();
  row.insertCell();
}

socket.on('scoreboard', (/** @type {ScoreboardEvent} */ scoreboard) => {
  scoreboard.forEach((entry, index) => {
    const row = scoreboardTableBody.rows[index];
    row.cells[1].textContent = entry.username;
    row.cells[2].textContent = String(entry.score);
  });
});
