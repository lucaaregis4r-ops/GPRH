/**
 * Modulo: ids
 * Responsabilidade: gerar IDs estaveis dentro de uma execucao deterministica.
 * Entrada: prefixo e contador interno
 * Saida: IDs legiveis como emp_001, sec_001, rel_001
 * Nao deve: depender de data, UUID aleatorio ou Math.random.
 */

function createIdFactory(initialCounters = {}) {
  const counters = { ...initialCounters };

  function nextId(prefix) {
    counters[prefix] = (counters[prefix] || 0) + 1;
    return `${prefix}_${String(counters[prefix]).padStart(3, "0")}`;
  }

  function getCounters() {
    return { ...counters };
  }

  return {
    nextId,
    getCounters,
  };
}

module.exports = {
  createIdFactory,
};
