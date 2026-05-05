// ══════════════════════════════════════════════════════════════
//  UTILITÁRIOS DE DESENHO
// ══════════════════════════════════════════════════════════════

/**
 * Desenha uma linha entre dois pontos
 */
function linha(page, x1, y1, x2, y2, cor, thickness = 0.6) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end:   { x: x2, y: y2 },
    thickness,
    color: cor,
  });
}

module.exports = {
  linha,
};
