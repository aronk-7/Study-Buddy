const WIDTH = 190;
const HEIGHT = 230;

function clampPosition(position, area) {
  return {
    x: Math.max(
      area.x,
      Math.min(area.x + Math.max(0, area.width - WIDTH), position.x),
    ),
    y: Math.max(
      area.y,
      Math.min(area.y + Math.max(0, area.height - HEIGHT), position.y),
    ),
  };
}

function distance(position, cursor) {
  return Math.hypot(
    position.x + WIDTH / 2 - cursor.x,
    position.y + HEIGHT * 0.75 - cursor.y,
  );
}

function chooseTarget(area, cursor, random = Math.random) {
  const left = area.x + 8;
  const right = area.x + Math.max(8, area.width - WIDTH - 8);
  const top = area.y + 8;
  const bottom = area.y + Math.max(8, area.height - HEIGHT - 8);
  const options = [
    { x: left + random() * (right - left), y: bottom },
    { x: left, y: top + random() * (bottom - top) },
    { x: right, y: top + random() * (bottom - top) },
  ];
  return clampPosition(
    options.sort((a, b) => distance(b, cursor) - distance(a, cursor))[0],
    area,
  );
}

function stepToward(position, target, amount) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const length = Math.hypot(dx, dy);
  if (length <= amount) return { ...target };
  return {
    x: position.x + (dx / length) * amount,
    y: position.y + (dy / length) * amount,
  };
}

function interactionArea(position, cursor, bubble = false) {
  const x = cursor.x - position.x;
  const y = cursor.y - position.y;
  const pet =
    x >= (WIDTH - 112) / 2 &&
    x <= (WIDTH + 112) / 2 &&
    y >= HEIGHT - 120 &&
    y <= HEIGHT - 8;
  const speech =
    bubble && x >= 10 && x <= WIDTH - 10 && y >= 8 && y < HEIGHT - 120;
  return pet || speech;
}

module.exports = {
  WIDTH,
  HEIGHT,
  clampPosition,
  chooseTarget,
  stepToward,
  distance,
  interactionArea,
};
