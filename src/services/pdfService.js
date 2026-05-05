const { PDFDocument } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const { COR, W, H } = require('../config/constants');
const { carregarFontes } = require('./fontService');
const {
  desenharBorda,
  desenharMarcaDagua,
  desenharCabecalho,
  desenharTitulo,
  desenharRodape,
} = require('./visualService');
const { centro, centroBloco, truncar } = require('../utils/text');
const { linha } = require('../utils/drawing');
const { fmtCurta } = require('../utils/formatter');
const { gerarCodigoVerificacao, gerarURLVerificacao } = require('../utils/verificationCode');
const { gerarQRCode } = require('../utils/qrCodeGenerator');

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * Carrega o background PNG e aplica na página.
 * Se o arquivo não existir, usa cor sólida como fallback.
 */
async function aplicarBackground(page, pdfDoc) {
  try {
    const bgPath = path.join(process.cwd(), 'assets', 'background.png');
    const bgBytes = fs.readFileSync(bgPath);
    const bgImage = await pdfDoc.embedPng(bgBytes);
    page.drawImage(bgImage, { x: 0, y: 0, width: W, height: H });
  } catch (err) {
    console.warn('[pdfService] Background ignorado, usando cor solida:', err.message);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COR.fundo });
  }
}

// ══════════════════════════════════════════════════════════════
//  SERVIÇO DE GERAÇÃO PDF
// ══════════════════════════════════════════════════════════════

/**
 * Gera certificado individual
 */
async function gerarIndividual(d) {
  const pdfDoc = await PDFDocument.create();
  const f = await carregarFontes(pdfDoc);

  const codigoVerificacao = gerarCodigoVerificacao(d);
  const urlVerificacao = gerarURLVerificacao(codigoVerificacao);

  let qrCodeDataUrl = null;
  try {
    qrCodeDataUrl = await gerarQRCode(urlVerificacao);
  } catch (err) {
    console.warn('[pdfService] Nao foi possivel gerar QR Code:', err.message);
  }

  const page = pdfDoc.addPage([W, H]);

  // Background da página
  await aplicarBackground(page, pdfDoc);

  desenharBorda(page);
  await desenharMarcaDagua(page, f, pdfDoc);
  const yPosC = await desenharCabecalho(page, f, pdfDoc);
  const yPosT = desenharTitulo(page, f, yPosC);

  let y = yPosT - 16;

  centro(page, 'Certificamos que', f.italic, 10.5, y, COR.cinza);
  y -= 24;

  centro(page, d.nome, f.boldItalic, 22, y, COR.verde);
  y -= 18;

  if (d.cargo) {
    const cargoStr = `${d.cargo}${d.matricula ? '  —  Matricula: ' + d.matricula : ''}`;
    centro(page, cargoStr, f.sans, 9, y, COR.cinza);
    y -= 16;
  }

  centro(page, 'concluiu com aproveitamento o curso', f.regular, 11, y, COR.preto);
  y -= 22;

  centro(page, d.curso, f.bold, 17, y, COR.verde);
  y -= 16;

  linha(page, W / 2 - 110, y, W / 2 + 110, y, COR.cinzaC, 0.5);
  y -= 14;

  const dets = [
    d.cargaHoraria ? `Carga Horaria: ${d.cargaHoraria} horas` : null,
    d.periodo      ? `Periodo: ${d.periodo}`                  : null,
    d.modalidade   ? `Modalidade: ${d.modalidade}`            : null,
    d.local        ? `Local: ${d.local}`                      : null,
  ].filter(Boolean);

  if (dets.length > 0) {
    centro(page, dets.join('   -   '), f.sans, 8.5, y, COR.cinza);
    y -= 14;
  }

  if (d.instrutor) {
    const instrStr = `Ministrado por ${d.instrutor}${d.instrCargo ? '  —  ' + d.instrCargo : ''}`;
    centro(page, instrStr, f.italic, 9, y, COR.cinza);
  }

  desenharRodape(page, f, d.prefeito, d.secretario, d.dataEmissao);

  page.drawText(`Codigo: ${codigoVerificacao}`, {
    x: 30, y: 18,
    font: f.sans, size: 7, color: COR.cinza,
  });

  if (qrCodeDataUrl) {
    try {
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrImage = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
      const qrSize = 50;
      page.drawImage(qrImage, { x: W - qrSize - 20, y: 15, width: qrSize, height: qrSize });
    } catch (err) {
      console.warn('[pdfService] Erro ao adicionar QR Code ao PDF:', err.message);
      page.drawText('[QR Code]', { x: W - 70, y: 18, font: f.sans, size: 7, color: COR.cinza });
    }
  }

  return pdfDoc.save();
}

/**
 * Gera certificado anual (frente + verso)
 */
async function gerarAnual(d) {
  const pdfDoc = await PDFDocument.create();
  const f = await carregarFontes(pdfDoc);

  const codigoVerificacao = gerarCodigoVerificacao(d);
  const urlVerificacao = gerarURLVerificacao(codigoVerificacao);

  let qrCodeDataUrl = null;
  try {
    qrCodeDataUrl = await gerarQRCode(urlVerificacao);
  } catch (err) {
    console.warn('[pdfService] Nao foi possivel gerar QR Code:', err.message);
  }

  const totalHoras = (d.cursos || []).reduce((s, c) => s + (parseInt(c.horas) || 0), 0);

  // ── FRENTE ────────────────────────────────────────────────
  const pgF = pdfDoc.addPage([W, H]);
  await aplicarBackground(pgF, pdfDoc);
  desenharBorda(pgF);
  await desenharMarcaDagua(pgF, f, pdfDoc);
  const yCF = await desenharCabecalho(pgF, f, pdfDoc);
  const yTF = desenharTitulo(pgF, f, yCF);

  let y = yTF - 16;

  centro(pgF, 'Certificamos que o(a) servidor(a)', f.italic, 10.5, y, COR.cinza);
  y -= 24;

  centro(pgF, d.nome, f.boldItalic, 22, y, COR.verde);
  y -= 18;

  if (d.cargo) {
    const cargoStr = `${d.cargo}${d.matricula ? '  —  Matricula: ' + d.matricula : ''}`;
    centro(pgF, cargoStr, f.sans, 9, y, COR.cinza);
    y -= 16;
  }

  centro(pgF, 'concluiu com aproveitamento as capacitacoes e formacoes continuadas', f.regular, 11, y, COR.preto);
  y -= 16;
  centro(pgF, `promovidas pela Secretaria Municipal de Educacao no ${d.periodoTexto},`, f.regular, 11, y, COR.preto);
  y -= 16;
  centro(pgF, 'totalizando uma carga horaria de:', f.regular, 11, y, COR.preto);
  y -= 32;

  centro(pgF, `${totalHoras} horas`, f.bold, 28, y, COR.verde);
  y -= 20;

  centro(pgF, 'A relacao completa dos cursos consta no verso deste certificado.', f.italic, 8.5, y, COR.cinza);

  desenharRodape(pgF, f, d.prefeito, d.secretario, d.dataEmissao);

  // ── VERSO ─────────────────────────────────────────────────
  const pgV = pdfDoc.addPage([W, H]);
  await aplicarBackground(pgV, pdfDoc);
  desenharBorda(pgV);

  let yV = H - 48;

  centro(pgV, 'RELACAO DE CURSOS REALIZADOS', f.sansBold, 10, yV, COR.verde);
  yV -= 14;

  const subtitulo = `${d.nome}${d.cargo ? '  —  ' + d.cargo : ''}   -   ${d.periodoTexto}`;
  centro(pgV, subtitulo, f.sans, 8, yV, COR.cinza);
  yV -= 8;
  linha(pgV, 50, yV, W - 50, yV, COR.dourado, 0.7);
  yV -= 4;

  const COLS = [
    { label: '#',                   x:  52, w:  22, align: 'center' },
    { label: 'CURSO / TREINAMENTO', x:  78, w: 315, align: 'left'   },
    { label: 'C.H.',                x: 397, w:  44, align: 'center' },
    { label: 'PERIODO',             x: 445, w: 110, align: 'center' },
    { label: 'MODALIDADE',          x: 559, w:  78, align: 'center' },
    { label: 'LOCAL / INSTITUICAO', x: 641, w: 152, align: 'left'   },
  ];

  const ROW_H   = 17;
  const TABLE_X = 50;
  const TABLE_W = W - 100;

  pgV.drawRectangle({ x: TABLE_X, y: yV - ROW_H + 4, width: TABLE_W, height: ROW_H, color: COR.verde });

  for (const col of COLS) {
    const tw = f.sansBold.widthOfTextAtSize(col.label, 7);
    let hx = col.x;
    if (col.align === 'center') hx = col.x + (col.w - tw) / 2;
    pgV.drawText(col.label, {
      x: hx, y: yV - ROW_H + 9,
      font: f.sansBold, size: 7, color: COR.branco,
    });
  }
  yV -= ROW_H;

  const cursos = d.cursos || [];
  for (let i = 0; i < cursos.length; i++) {
    const c  = cursos[i];
    const bg = i % 2 === 0 ? COR.branco : COR.verdeBg;

    pgV.drawRectangle({ x: TABLE_X, y: yV - ROW_H + 4, width: TABLE_W, height: ROW_H, color: bg });

    const periodo    = c.inicio && c.fim
      ? `${fmtCurta(c.inicio)} a ${fmtCurta(c.fim)}`
      : c.inicio ? fmtCurta(c.inicio) : '-';
    const nomeTrunc  = truncar(c.nome  || '-', f.sans, 8, COLS[1].w - 4);
    const localTrunc = truncar(c.local || '-', f.sans, 8, COLS[5].w - 4);

    const celulas = [
      { col: COLS[0], text: String(i + 1),                  font: f.sansBold, size: 8   },
      { col: COLS[1], text: nomeTrunc,                      font: f.sans,     size: 8   },
      { col: COLS[2], text: c.horas ? `${c.horas}h` : '-', font: f.sansBold, size: 8   },
      { col: COLS[3], text: periodo,                        font: f.sans,     size: 7.5 },
      { col: COLS[4], text: c.modalidade || '-',            font: f.sans,     size: 7.5 },
      { col: COLS[5], text: localTrunc,                     font: f.sans,     size: 7.5 },
    ];

    for (const cel of celulas) {
      const tw = cel.font.widthOfTextAtSize(cel.text, cel.size);
      let cx = cel.col.x + 2;
      if (cel.col.align === 'center') cx = cel.col.x + (cel.col.w - tw) / 2;
      pgV.drawText(cel.text, {
        x: cx, y: yV - ROW_H + 7,
        font: cel.font, size: cel.size, color: COR.preto,
      });
    }

    linha(pgV, TABLE_X, yV - ROW_H + 4, TABLE_X + TABLE_W, yV - ROW_H + 4, COR.cinzaC, 0.3);
    yV -= ROW_H;
  }

  // Linha de total
  pgV.drawRectangle({
    x: TABLE_X, y: yV - ROW_H + 4,
    width: TABLE_W, height: ROW_H,
    color: COR.verdeBg, borderColor: COR.verde, borderWidth: 0.5,
  });

  pgV.drawText('Total de Horas de Formacao:', {
    x: COLS[1].x, y: yV - ROW_H + 7,
    font: f.sansBold, size: 8, color: COR.verde,
  });

  const totalStr = `${totalHoras}h`;
  const totalTW  = f.sansBold.widthOfTextAtSize(totalStr, 9);
  pgV.drawText(totalStr, {
    x: COLS[2].x + (COLS[2].w - totalTW) / 2, y: yV - ROW_H + 7,
    font: f.sansBold, size: 9, color: COR.verde,
  });

  yV -= ROW_H + 16;

  const assX = W - 82 - 200;
  linha(pgV, assX, yV, assX + 200, yV, COR.preto, 0.5);
  centroBloco(pgV, d.secretario, f.sansBold, 8, yV - 10, assX, 200, COR.preto);
  centroBloco(pgV, 'Secretário(a) Municipal de Educação', f.sans, 7.5, yV - 20, assX, 200, COR.cinza);

  pgV.drawText(`Codigo: ${codigoVerificacao}`, {
    x: 30, y: 18,
    font: f.sans, size: 7, color: COR.cinza,
  });

  if (qrCodeDataUrl) {
    try {
      const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrImage = await pdfDoc.embedPng(Buffer.from(base64Data, 'base64'));
      const qrSize  = 50;
      pgV.drawImage(qrImage, { x: W - qrSize - 20, y: 15, width: qrSize, height: qrSize });
    } catch (err) {
      console.warn('[pdfService] Erro ao adicionar QR Code ao verso:', err.message);
      pgV.drawText('[QR Code]', { x: W - 70, y: 18, font: f.sans, size: 7, color: COR.cinza });
    }
  }

  return pdfDoc.save();
}

module.exports = {
  gerarIndividual,
  gerarAnual,
};
