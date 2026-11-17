export const STATIONS = [
  { id: 'oak', name: '树下的纸笺', place: '老橡树', x: 240, y: 390, note: '“留一条小径，给晚归的人。”', reply: '第一声风铃，像一句好久不见。', pitch: 523.25 },
  { id: 'stream', name: '溪边的纸笺', place: '石桥边', x: 610, y: 448, note: '“风停的时候，也可以歇一歇。”', reply: '溪水接住了铃声。脚步也可以慢下来。', pitch: 659.25 },
  { id: 'home', name: '门前的纸笺', place: '小屋前', x: 782, y: 363, note: '“你愿意回来，小庭就又有了季节。”', reply: '窗里亮起一盏灯。原来这里一直为你留着位置。', pitch: 783.99 }
];
export const SAVE_KEY = 'wind-return-garden:v1';
export function chargeQuality(seconds) { return seconds >= .8 && seconds <= 1.65 ? 'gentle' : seconds < .8 ? 'soft' : 'strong'; }
export function readSave(text) {
  try {
    const s = JSON.parse(text);
    if (!s || s.version !== 1 || !Array.isArray(s.completed)) return { completed: [], ended: false };
    const completed = [...new Set(s.completed.filter(id => STATIONS.some(s => s.id === id)))];
    return { completed, ended: completed.length === 3 && s.ended === true };
  } catch { return { completed: [], ended: false }; }
}
export function savePayload(completed, ended) { return JSON.stringify({ version: 1, completed: [...completed], ended: !!ended }); }
export function canRing(station, player, seconds, read) { return read && Math.hypot(station.x - player.x, station.y - player.y) < 83 && chargeQuality(seconds) === 'gentle'; }
