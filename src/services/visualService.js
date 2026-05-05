const { COR, W, H } = require('../config/constants');
const { linha } = require('../utils/drawing');
const { centro, centroBloco } = require('../utils/text');
const path = require('path');
const fs = require('fs');

// ══════════════════════════════════════════════════════════════
//  ELEMENTOS VISUAIS REUTILIZÁVEIS
// ══════════════════════════════════════════════════════════════

/**
 * Desenha a borda decorativa do certificado
 */
function desenharBorda(page) {
  page.drawRectangle({
    x: 16, y: 16,
    width: W - 32, height: H - 32,
    borderColor: COR.dourado,
    borderWidth: 2.5,
  });
  page.drawRectangle({
    x: 24, y: 24,
    width: W - 48, height: H - 48,
    borderColor: COR.dourado,
    borderWidth: 0.5,
    opacity: 0.6,
  });
  const pontos = [[16, 16], [W - 16, 16], [16, H - 16], [W - 16, H - 16]];
  for (const [cx, cy] of pontos) {
    page.drawCircle({ x: cx, y: cy, size: 4, color: COR.dourado });
  }
}

/**
 * Desenha marca d'água com o logo SMED (sem caracteres Unicode especiais)
 */
async function desenharMarcaDagua(page, f, pdfDoc) {
  try {
    const logoPath = path.join(process.cwd(), 'assets', 'logo_smed.png');
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const size = 220;
    page.drawImage(logoImage, {
      x: W / 2 - size / 2,
      y: H / 2 - size / 2,
      width: size,
      height: size,
      opacity: 0.04,
    });
  } catch (err) {
    console.warn('[visualService] Marca d\'agua ignorada:', err.message);
  }
}

/**
 * Desenha cabeçalho com logo SMED
 */
async function desenharCabecalho(page, f, pdfDoc) {
  const y = H - 52;
  linha(page, 56, y + 14, W - 56, y + 14, COR.dourado, 0.4);
  centro(page, 'PREFEITURA MUNICIPAL DE VACARIA', f.sans, 7, y, COR.cinza);
  centro(page, 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', f.sansBold, 9.5, y - 13, COR.verde);
  centro(page, 'Vacaria — Rio Grande do Sul', f.sans, 7, y - 24, COR.cinza);
  linha(page, 56, y - 34, W - 56, y - 34, COR.dourado, 0.4);

  // Logo no canto superior esquerdo
  try {
    const logoPath = path.join(process.cwd(), 'assets', 'logo_smed.png');
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoSize = 44;
    page.drawImage(logoImage, {
      x: 56,
      y: y - 22,
      width: logoSize,
      height: logoSize,
    });
  } catch (err) {
    console.warn('[visualService] Logo do cabecalho ignorado:', err.message);
  }

  return y - 34;
}

/**
 * Desenha título "CERTIFICADO" — sem caracteres Unicode especiais
 */
function desenharTitulo(page, f, yBase) {
  const y = yBase - 40;
  centro(page, 'C  E  R  T  I  F  I  C  A  D  O', f.bold, 26, y, COR.verde);
  // Divisor ornamental usando apenas linhas e círculo (sem glyphs especiais)
  const mid = W / 2;
  linha(page, mid - 130, y - 9, mid - 5,  y - 9, COR.dourado, 0.8);
  linha(page, mid + 5,   y - 9, mid + 130, y - 9, COR.dourado, 0.8);
  page.drawCircle({ x: mid, y: y - 9, size: 2.5, color: COR.dourado });
  return y - 14;
}

/**
 * Desenha rodapé com assinaturas
 */
function desenharRodape(page, f, prefeito, secretario, dataEmissao) {
  const yL = 64;
  const yN = 54;
  const yC = 44;

  // Assinatura esquerda — Prefeito
  linha(page, 82, yL, 282, yL, COR.preto, 0.5);
  centroBloco(page, prefeito, f.sansBold, 8, yN, 82, 200, COR.preto);
  centroBloco(page, 'Prefeito(a) Municipal de Vacaria/RS', f.sans, 7.5, yC, 82, 200, COR.cinza);

  // Data centralizada
  centro(page, `Vacaria, ${dataEmissao}`, f.sans, 8.5, yN, COR.cinza);

  // Assinatura direita — Secretário(a)
  linha(page, W - 282, yL, W - 82, yL, COR.preto, 0.5);
  centroBloco(page, secretario, f.sansBold, 8, yN, W - 282, 200, COR.preto);
  centroBloco(page, 'Secretário(a) Municipal de Educação', f.sans, 7.5, yC, W - 282, 200, COR.cinza);
}

module.exports = {
  desenharBorda,
  desenharMarcaDagua,
  desenharCabecalho,
  desenharTitulo,
  desenharRodape,
};
