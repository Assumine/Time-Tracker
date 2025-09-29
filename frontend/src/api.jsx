export const API_BASE = "http://127.0.0.1:30022";

export async function getLogs() {
  const res = await fetch(`${API_BASE}/logs`);
  return res.json();
}

export async function getStats(period = "day") {
  const res = await fetch(`${API_BASE}/stats?period=${period}`);
  return res.json();
}
