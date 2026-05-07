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
const { centro, truncar } = require('../utils/text');
const { linha } = require('../utils/drawing');
const { fmtCurta } = require('../utils/formatter');
const { gerarQRCode } = require('../utils/qrCodeGenerator');

// ══════════════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════════════

async function aplicarBackground(page, pdfDoc) {
  try {
    const bgPath = path.join(process.cwd(), 'assets', 'background.png');
    const bgBytes = fs.readFileSync(bgPath);
    const bgImage = await pdfDoc.embedPng(bgBytes);
    page.drawImage(bgImage, { x: 0, y: 0, width: W, height: H });
  } catch (err) {
    console.warn('[pdfService] Background ignorado:', err.message);
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COR.fundo });
  }
}

// Gera e embeda o QR Code a partir da URL recebida
async function embedQRCode(pdfDoc, urlVerificacao) {
  try {
    const dataUrl = await gerarQRCode(urlVerificacao);
    const base64  = dataUrl.replace(/^data:image\/png;base64,/, '');
    return await pdfDoc.embedPng(Buffer.from(base64, 'base64'));
  } catch (err) {
    console.warn('[pdfService] QR Code nao gerado:', err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  CERTIFICADO INDIVIDUAL
//  Recebe codigoVerificacao e urlVerificacao já gerados
// ══════════════════════════════════════════════════════════════

async function gerarIndividual(d) {
  const pdfDoc = await PDFDocument.create();
  const f      = await carregarFontes(pdfDoc);

  // Usa o código e URL recebidos — NÃO gera novos aqui
  const qrImage = await embedQRCode(pdfDoc, d.urlVerificacao);

  const page = pdfDoc.addPage([W, H]);
  await aplicarBackground(page, pdfDoc);
  desenharBorda(page);
  await desenharMarcaDagua(page, f, pdfDoc);

  const yPosC = await desenharCabecalho(page, f, pdfDoc);
  const yPosT = desenharTitulo(page, f, yPosC);

  let y = yPosT - 30;

  centro(page, 'Certificamos que', f.italic, 13, y, COR.cinza);
  y -= 38;

  centro(page, d.nome, f.boldItalic, 32, y, COR.verde);
  y -= 26;

  if (d.cargo || d.matricula) {
    const cargoStr = [
      d.cargo,
      d.matricula ? `Matricula: ${d.matricula}` : null,
    ].filter(Boolean).join('   —   ');
    centro(page, cargoStr, f.sans, 10, y, COR.cinza);
    y -= 30;
  } else {
    y -= 10;
  }

  centro(page, 'concluiu com aproveitamento o curso', f.regular, 13, y, COR.preto);
  y -= 34;

  centro(page, d.curso, f.bold, 22, y, COR.verde);
  y -= 22;

  linha(page, W / 2 - 180, y, W / 2 + 180, y, COR.cinzaC, 0.6);
  y -= 24;

  const dets = [
    d.cargaHoraria ? `Carga Horaria: ${d.cargaHoraria}h` : null,
    d.periodo      ? `Periodo: ${d.periodo}`              : null,
    d.modalidade   ? `Modalidade: ${d.modalidade}`        : null,
    d.local        ? `Local: ${d.local}`                  : null,
  ].filter(Boolean);

  if (dets.length > 0) {
    centro(page, dets.join('   ·   '), f.sans, 10, y, COR.cinza);
    y -= 24;
  }

  if (d.instrutor) {
    const instrStr = `Ministrado por ${d.instrutor}${d.instrCargo ? '   —   ' + d.instrCargo : ''}`;
    centro(page, instrStr, f.italic, 11, y, COR.cinza);
  }

  desenharRodape(page, f, d.dataEmissao, d.codigoVerificacao, qrImage);

  return pdfDoc.save();
}

// ══════════════════════════════════════════════════════════════
//  CERTIFICADO ANUAL (frente + verso)
//  Recebe codigoVerificacao e urlVerificacao já gerados
// ══════════════════════════════════════════════════════════════

async function gerarAnual(d) {
  const pdfDoc = await PDFDocument.create();
  const f      = await carregarFontes(pdfDoc);

  const qrImage = await embedQRCode(pdfDoc, d.urlVerificacao);

  const totalHoras = (d.cursos || []).reduce((s, c) => s + (parseInt(c.horas) || 0), 0);

  // ── FRENTE ────────────────────────────────────────────────
  const pgF = pdfDoc.addPage([W, H]);
  await aplicarBackground(pgF, pdfDoc);
  desenharBorda(pgF);
  await desenharMarcaDagua(pgF, f, pdfDoc);

  const yCF = await desenharCabecalho(pgF, f, pdfDoc);
  const yTF = desenharTitulo(pgF, f, yCF);

  let y = yTF - 30;

  centro(pgF, 'Certificamos que o(a) servidor(a)', f.italic, 13, y, COR.cinza);
  y -= 38;

  centro(pgF, d.nome, f.boldItalic, 32, y, COR.verde);
  y -= 26;

  if (d.cargo || d.matricula) {
    const cargoStr = [
      d.cargo,
      d.matricula ? `Matricula: ${d.matricula}` : null,
    ].filter(Boolean).join('   —   ');
    centro(pgF, cargoStr, f.sans, 10, y, COR.cinza);
    y -= 30;
  } else {
    y -= 10;
  }

  centro(pgF, 'concluiu com aproveitamento as capacitacoes e formacoes continuadas', f.regular, 12, y, COR.preto);
  y -= 22;
  centro(pgF, `promovidas pela Secretaria Municipal de Educacao no ${d.periodoTexto},`, f.regular, 12, y, COR.preto);
  y -= 22;
  centro(pgF, 'totalizando uma carga horaria de:', f.regular, 12, y, COR.preto);
  y -= 46;

  centro(pgF, `${totalHoras} horas`, f.bold, 36, y, COR.verde);
  y -= 30;

  centro(pgF, 'A relacao completa dos cursos consta no verso deste certificado.', f.italic, 10, y, COR.cinza);

  desenharRodape(pgF, f, d.dataEmissao, d.codigoVerificacao, qrImage);

  // ── VERSO ─────────────────────────────────────────────────
  const pgV = pdfDoc.addPage([W, H]);
  await aplicarBackground(pgV, pdfDoc);
  desenharBorda(pgV);

  let yV = H - 48;

  centro(pgV, 'RELACAO DE CURSOS REALIZADOS', f.sansBold, 11, yV, COR.verde);
  yV -= 16;

  const subtitulo = `${d.nome}${d.cargo ? '   —   ' + d.cargo : ''}   ·   ${d.periodoTexto}`;
  centro(pgV, subtitulo, f.sans, 9, yV, COR.cinza);
  yV -= 10;
  linha(pgV, 50, yV, W - 50, yV, COR.dourado, 0.7);
  yV -= 6;

  const COLS = [
    { label: '#',                   x:  52, w:  22, align: 'center' },
    { label: 'CURSO / TREINAMENTO', x:  78, w: 315, align: 'left'   },
    { label: 'C.H.',                x: 397, w:  44, align: 'center' },
    { label: 'PERIODO',             x: 445, w: 110, align: 'center' },
    { label: 'MODALIDADE',          x: 559, w:  78, align: 'center' },
    { label: 'LOCAL / INSTITUICAO', x: 641, w: 152, align: 'left'   },
  ];

  const ROW_H   = 19;
  const TABLE_X = 50;
  const TABLE_W = W - 100;

  pgV.drawRectangle({ x: TABLE_X, y: yV - ROW_H + 4, width: TABLE_W, height: ROW_H, color: COR.verde });

  for (const col of COLS) {
    const tw = f.sansBold.widthOfTextAtSize(col.label, 7.5);
    let hx = col.x;
    if (col.align === 'center') hx = col.x + (col.w - tw) / 2;
    pgV.drawText(col.label, {
      x: hx, y: yV - ROW_H + 9,
      font: f.sansBold, size: 7.5, color: COR.branco,
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
    const nomeTrunc  = truncar(c.nome  || '-', f.sans, 8.5, COLS[1].w - 4);
    const localTrunc = truncar(c.local || '-', f.sans, 8.5, COLS[5].w - 4);

    const celulas = [
      { col: COLS[0], text: String(i + 1),                  font: f.sansBold, size: 8.5 },
      { col: COLS[1], text: nomeTrunc,                      font: f.sans,     size: 8.5 },
      { col: COLS[2], text: c.horas ? `${c.horas}h` : '-', font: f.sansBold, size: 8.5 },
      { col: COLS[3], text: periodo,                        font: f.sans,     size: 8   },
      { col: COLS[4], text: c.modalidade || '-',            font: f.sans,     size: 8   },
      { col: COLS[5], text: localTrunc,                     font: f.sans,     size: 8   },
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

  // Total
  pgV.drawRectangle({
    x: TABLE_X, y: yV - ROW_H + 4,
    width: TABLE_W, height: ROW_H,
    color: COR.verdeBg, borderColor: COR.verde, borderWidth: 0.5,
  });
  pgV.drawText('Total de Horas de Formacao:', {
    x: COLS[1].x, y: yV - ROW_H + 7,
    font: f.sansBold, size: 9, color: COR.verde,
  });
  const totalStr = `${totalHoras}h`;
  const totalTW  = f.sansBold.widthOfTextAtSize(totalStr, 10);
  pgV.drawText(totalStr, {
    x: COLS[2].x + (COLS[2].w - totalTW) / 2, y: yV - ROW_H + 7,
    font: f.sansBold, size: 10, color: COR.verde,
  });

  desenharRodape(pgV, f, d.dataEmissao, d.codigoVerificacao, qrImage);

  return pdfDoc.save();
}

module.exports = { gerarIndividual, gerarAnual };
