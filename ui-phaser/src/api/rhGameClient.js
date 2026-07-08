export async function fetchGameSnapshot() {
  return fetchJson("/api/game-snapshot");
}

export async function startDailySession(seed) {
  return postJson("/api/daily/new", { seed });
}

export async function playDailyAction(action) {
  return postJson("/api/daily/action", action);
}

export async function endDay() {
  return postJson("/api/daily/end-day", {});
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Falha HTTP ${response.status}`);
  return data;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Falha HTTP ${response.status}`);
  return data;
}
