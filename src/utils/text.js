const { W } = require('../config/constants');

// ══════════════════════════════════════════════════════════════
//  UTILITÁRIOS DE TEXTO
// ══════════════════════════════════════════════════════════════

/**
 * Centraliza texto na largura total da página
 */
function centro(page, text, font, size, y, cor) {
  const x = (W - font.widthOfTextAtSize(text, size)) / 2;
  page.drawText(text, { x, y, font, size, color: cor });
}

/**
 * Centraliza texto dentro de um bloco (x, largura)
 */
function centroBloco(page, text, font, size, y, bx, bw, cor) {
  const x = bx + (bw - font.widthOfTextAtSize(text, size)) / 2;
  page.drawText(text, { x, y, font, size, color: cor });
}

/**
 * Trunca texto ao caber em maxWidth com a fonte/size dados
 */
function truncar(text, font, size, maxWidth) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

module.exports = {
  centro,
  centroBloco,
  truncar,
};
