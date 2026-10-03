const DAY = 86_400_000;

function dateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(key, count) {
  const date = new Date(`${key}T12:00:00`);
  date.setDate(date.getDate() + count);
  return dateKey(date);
}

function dayDistance(from, to) {
  return Math.round(
    (Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY,
  );
}

function hearts(mood) {
  return mood <= 0 ? 0 : Math.min(5, Math.floor(mood / 20) + 1);
}

function evolution(streak) {
  return streak >= 100 ? 3 : streak >= 30 ? 2 : streak >= 7 ? 1 : 0;
}

function animation(pet, timer, now = Date.now(), notice = null) {
  const activeNotice = notice && notice.until > now;
  if (activeNotice && notice.state === "celebrating") return "celebrating";
  if (timer.status === "running")
    return timer.phase === "work" ? "studying" : "resting";
  if (activeNotice && notice.state === "happy") return "happy";
  if (pet.last_active_at && now - pet.last_active_at >= 180_000)
    return "sleeping";
  return "idle";
}

const defaultSettings = {
  work: 25,
  shortBreak: 5,
  longBreak: 20,
  notifications: true,
};

const defaultPet = {
  name: "Buddy",
  pet_type: "duckling",
  evolution_stage: 0,
  current_mood: 80,
  current_streak: 0,
  last_study_date: "",
  overlay_position: null,
  hearts: 5,
  last_active_at: 0,
};

function text(value, max = 160) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new Error(`Enter text between 1 and ${max} characters.`);
  }
  return value.trim();
}

function number(value, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Enter a number between ${min} and ${max}.`);
  }
  return value;
}

function validateSettings(input) {
  return {
    work: number(Number(input.work), 1, 180),
    shortBreak: number(Number(input.shortBreak), 1, 60),
    longBreak: number(Number(input.longBreak), 1, 120),
    notifications: Boolean(input.notifications),
  };
}

module.exports = {
  dateKey,
  addDays,
  dayDistance,
  hearts,
  evolution,
  animation,
  defaultSettings,
  defaultPet,
  text,
  number,
  validateSettings,
};
