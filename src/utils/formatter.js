// ══════════════════════════════════════════════════════════════
//  FUNÇÕES DE FORMATAÇÃO
// ══════════════════════════════════════════════════════════════

/**
 * Formata data YYYY-MM-DD para "d de mês de yyyy"
 */
function fmtData(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const M = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro',
  ];
  return `${+d} de ${M[+m - 1]} de ${y}`;
}

/**
 * Formata data YYYY-MM-DD para "dd/mm/yyyy"
 */
function fmtCurta(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Retorna data de hoje formatada como YYYY-MM-DD
 */
function obterDataHoje() {
  return new Date().toISOString().split('T')[0];
}

module.exports = {
  fmtData,
  fmtCurta,
  obterDataHoje,
};
