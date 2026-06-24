const { COR, W, H } = require('../config/constants');
const { linha } = require('../utils/drawing');
const { centro } = require('../utils/text');

// ══════════════════════════════════════════════════════════════
//  ELEMENTOS VISUAIS REUTILIZÁVEIS
// ══════════════════════════════════════════════════════════════

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

async function desenharMarcaDagua(page, f, pdfDoc) {
  // Intencionalmente vazio — background já contém os logos
}

async function desenharCabecalho(page, f, pdfDoc) {
  const y = H - 52;
  linha(page, 56, y + 14, W - 56, y + 14, COR.dourado, 0.4);
  centro(page, 'PREFEITURA MUNICIPAL DE VACARIA', f.sans, 8, y, COR.cinza);
  centro(page, 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', f.sansBold, 11, y - 15, COR.verde);
  centro(page, 'Vacaria — Rio Grande do Sul', f.sans, 8, y - 28, COR.cinza);
  linha(page, 56, y - 38, W - 56, y - 38, COR.dourado, 0.4);
  return y - 38;
}

function desenharTitulo(page, f, yBase) {
  const y = yBase - 44;
  centro(page, 'C  E  R  T  I  F  I  C  A  D  O', f.bold, 30, y, COR.verde);
  const mid = W / 2;
  linha(page, mid - 140, y - 10, mid - 5,   y - 10, COR.dourado, 0.8);
  linha(page, mid + 5,   y - 10, mid + 140, y - 10, COR.dourado, 0.8);
  page.drawCircle({ x: mid, y: y - 10, size: 3, color: COR.dourado });
  return y - 16;
}

/**
 * Rodapé com:
 * - Esquerda: prefeito + secretária
 * - Centro: texto itálico + data + código (com espaçamento maior entre eles)
 * - Direita: QR Code + texto de autenticidade
 *
 * Zona segura: y entre 132 e 230
 */
function desenharRodape(page, f, dataEmissao, codigo, qrImage, prefeito, secretario) {
  const Y_SEP = 230;
  linha(page, 56, Y_SEP, W - 56, Y_SEP, COR.dourado, 0.35);

  // ── ESQUERDA: Prefeito ─────────────────────────────────────
  page.drawText(prefeito || 'Andre Luiz Rokoski', {
    x: 60, y: Y_SEP - 16,
    font: f.sansBold, size: 8, color: COR.preto,
  });
  page.drawText('Prefeito Municipal de Vacaria/RS', {
    x: 60, y: Y_SEP - 28,
    font: f.sans, size: 7.5, color: COR.cinza,
  });

  // ── ESQUERDA INFERIOR: Secretária ──────────────────────────
  page.drawText(secretario || 'Adriana Ferreira Boeira', {
    x: 60, y: Y_SEP - 48,
    font: f.sansBold, size: 8, color: COR.preto,
  });
  page.drawText('Secretária Municipal de Educação', {
    x: 60, y: Y_SEP - 60,
    font: f.sans, size: 7.5, color: COR.cinza,
  });

  // ── CENTRO: texto itálico + data + código ─────────────────
  // Espaçamento maior entre as três linhas (16px entre cada)
  centro(page, 'A relação completa dos cursos consta no verso deste certificado.', f.italic, 8, Y_SEP - 16, COR.cinza);
  centro(page, `Vacaria, ${dataEmissao}`, f.sans, 8.5, Y_SEP - 36, COR.cinza);
  centro(page, `Código: ${codigo}`, f.sans, 7.5, Y_SEP - 52, COR.cinza);

  // ── DIREITA: QR Code + texto ───────────────────────────────
  const QR_SIZE = 56;
  const QR_X    = W - QR_SIZE - 56;
  const QR_Y    = Y_SEP - QR_SIZE - 6;

  if (qrImage) {
    page.drawImage(qrImage, {
      x: QR_X, y: QR_Y,
      width: QR_SIZE, height: QR_SIZE,
    });
  }

  const TX = QR_X - 172;
  const TY = QR_Y + QR_SIZE - 10;
  page.drawText('Autenticação digital', {
    x: TX, y: TY,
    font: f.sansBold, size: 8, color: COR.verde,
  });
  page.drawText('Documento com validade jurídica.', {
    x: TX, y: TY - 14,
    font: f.sans, size: 7.5, color: COR.cinza,
  });
  page.drawText('Escaneie o QR Code para verificar', {
    x: TX, y: TY - 26,
    font: f.sans, size: 7.5, color: COR.cinza,
  });
  page.drawText('a autenticidade deste certificado.', {
    x: TX, y: TY - 38,
    font: f.sans, size: 7.5, color: COR.cinza,
  });
}

module.exports = {
  desenharBorda,
  desenharMarcaDagua,
  desenharCabecalho,
  desenharTitulo,
  desenharRodape,
};