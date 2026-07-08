/**
 * Modulo: rng
 * Responsabilidade: fornecer aleatoriedade deterministica baseada em seed.
 * Entrada: seed textual ou numerica
 * Saida: objeto RNG com metodos previsiveis
 * Nao deve: usar Math.random dentro da simulacao.
 */

function hashSeed(seed) {
  const text = String(seed || "RH-DEFAULT-SEED");
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRng(seed, options = {}) {
  let state = Number.isInteger(options.state) ? options.state >>> 0 : hashSeed(seed);

  function next() {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function int(min, max) {
    return Math.floor(next() * (max - min + 1)) + min;
  }

  function float(min, max, precision = 2) {
    const factor = 10 ** precision;
    return Math.round((next() * (max - min) + min) * factor) / factor;
  }

  function pick(items) {
    if (!items.length) return null;
    return items[int(0, items.length - 1)];
  }

  function chance(percent) {
    return next() * 100 < percent;
  }

  function weightedChoice(items, weightKey = "weight") {
    const total = items.reduce((sum, item) => sum + Math.max(0, item[weightKey] || 0), 0);
    if (total <= 0) return pick(items);

    let cursor = next() * total;
    for (const item of items) {
      cursor -= Math.max(0, item[weightKey] || 0);
      if (cursor <= 0) return item;
    }

    return items[items.length - 1];
  }

  function fork(label) {
    return createRng(`${seed}:${label}:${Math.floor(next() * 1000000000)}`);
  }

  function getState() {
    return state >>> 0;
  }

  return {
    seed,
    next,
    int,
    float,
    pick,
    chance,
    weightedChoice,
    fork,
    getState,
  };
}

module.exports = {
  createRng,
};
