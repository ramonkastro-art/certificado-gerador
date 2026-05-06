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
 * Desenha marca d'água com o logo SMED
 */
async function desenharMarcaDagua(page, f, pdfDoc) {
  try {
    const logoPath = path.join(process.cwd(), 'assets', 'logo_smed.png');
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const size = 200;
    page.drawImage(logoImage, {
      x: W / 2 - size / 2,
      y: H / 2 - size / 2,
      width: size,
      height: size,
      opacity: 0.04,
    });
  } catch (err) {
    console.warn('[visualService] Marca dagua ignorada:', err.message);
  }
}

/**
 * Desenha cabeçalho com logo SMED
 */
async function desenharCabecalho(page, f, pdfDoc) {
  const y = H - 52;
  linha(page, 56, y + 14, W - 56, y + 14, COR.dourado, 0.4);
  centro(page, 'PREFEITURA MUNICIPAL DE VACARIA', f.sans, 8, y, COR.cinza);
  centro(page, 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', f.sansBold, 11, y - 15, COR.verde);
  centro(page, 'Vacaria — Rio Grande do Sul', f.sans, 8, y - 28, COR.cinza);
  linha(page, 56, y - 38, W - 56, y - 38, COR.dourado, 0.4);

  // Logo no canto superior esquerdo
  try {
    const logoPath = path.join(process.cwd(), 'assets', 'logo_smed.png');
    const logoBytes = fs.readFileSync(logoPath);
    const logoImage = await pdfDoc.embedPng(logoBytes);
    const logoSize = 52;
    page.drawImage(logoImage, {
      x: 56,
      y: y - 26,
      width: logoSize,
      height: logoSize,
    });
  } catch (err) {
    console.warn('[visualService] Logo do cabecalho ignorado:', err.message);
  }

  return y - 38;
}

/**
 * Desenha título "CERTIFICADO"
 */
function desenharTitulo(page, f, yBase) {
  const y = yBase - 44;
  centro(page, 'C  E  R  T  I  F  I  C  A  D  O', f.bold, 30, y, COR.verde);
  const mid = W / 2;
  linha(page, mid - 140, y - 10, mid - 5, y - 10, COR.dourado, 0.8);
  linha(page, mid + 5,   y - 10, mid + 140, y - 10, COR.dourado, 0.8);
  page.drawCircle({ x: mid, y: y - 10, size: 3, color: COR.dourado });
  return y - 16;
}

/**
 * Desenha rodapé apenas com data e código de verificação
 * (sem linhas de assinatura — autenticação feita pelo QR Code)
 */
function desenharRodape(page, f, dataEmissao) {
  // Linha separadora acima do rodapé
  linha(page, 56, 90, W - 56, 90, COR.dourado, 0.3);
  // Data centralizada
  centro(page, `Vacaria, ${dataEmissao}`, f.sans, 9, 72, COR.cinza);
  // Nota de autenticidade
  centro(page, 'Documento autentico — valide pelo QR Code', f.italic, 7.5, 56, COR.cinza);
}

module.exports = {
  desenharBorda,
  desenharMarcaDagua,
  desenharCabecalho,
  desenharTitulo,
  desenharRodape,
};
