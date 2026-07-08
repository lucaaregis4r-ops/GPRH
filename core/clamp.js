/**
 * Modulo: clamp
 * Responsabilidade: limitar valores numericos em faixas previsiveis.
 * Entrada: value, min, max
 * Saida: numero limitado entre min e max
 * Nao deve: conhecer regras especificas da simulacao de RH.
 */

function clamp(value, min = 0, max = 100) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampPercent(value) {
  return clamp(Math.round(value), 0, 100);
}

module.exports = {
  clamp,
  clampPercent,
};
