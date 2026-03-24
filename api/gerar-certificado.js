const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { pdflibAddPlaceholder } = require('@signpdf/placeholder-pdf-lib');
const signpdf = require('@signpdf/signpdf').default;
const { P12Signer } = require('@signpdf/signer-p12');
const fs = require('fs').promises;
const path = require('path');

// Cores
const C = {
  navy:      rgb(0.051, 0.122, 0.235),
  navyMid:   rgb(0.102, 0.196, 0.376),
  gold:      rgb(0.722, 0.588, 0.227),
  white:     rgb(1, 1, 1),
  offWhite:  rgb(0.98, 0.97, 0.95),
  gray:      rgb(0.45, 0.45, 0.45),
  lightGray: rgb(0.80, 0.78, 0.75),
  black:     rgb(0.15, 0.15, 0.15),
  rowAlt:    rgb(0.94, 0.93, 0.90),
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const centerText = (page, font, text, y, size, color) => {
  const W = page.getWidth();
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (W - tw) / 2, y, size, font, color });
};

const rightText = (page, font, text, marginRight, y, size, color) => {
  const W = page.getWidth();
  const tw = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: W - marginRight - tw, y, size, font, color });
};

const hLine = (page, y, color, thickness) => {
  const W = page.getWidth();
  page.drawLine({ start: { x: 50, y }, end: { x: W - 50, y }, thickness: thickness || 0.5, color });
};

function drawBorder(page) {
  const W = page.getWidth();
  const H = page.getHeight();
  const m  = 22;
  const m2 = 30;
  const cs = 6;
  const ci = 3.5;

  page.drawRectangle({ x: m, y: m, width: W - m*2, height: H - m*2,
    borderColor: C.navy, borderWidth: 2.5, color: undefined });
  page.drawRectangle({ x: m2, y: m2, width: W - m2*2, height: H - m2*2,
    borderColor: C.gold, borderWidth: 0.8, color: undefined });

  [[m,m],[W-m-cs,m],[m,H-m-cs],[W-m-cs,H-m-cs]].forEach(([x,y]) =>
    page.drawRectangle({ x, y, width: cs, height: cs, color: C.gold }));
  [[m2,m2],[W-m2-ci,m2],[m2,H-m2-ci],[W-m2-ci,H-m2-ci]].forEach(([x,y]) =>
    page.drawRectangle({ x, y, width: ci, height: ci, color: C.navy }));
}

function accentBars(page) {
  const W = page.getWidth();
  const H = page.getHeight();
  page.drawRectangle({ x: 0, y: H - 8,  width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: H - 12, width: W, height: 4, color: C.gold });
  page.drawRectangle({ x: 0, y: 0,      width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: 8,      width: W, height: 4, color: C.gold });
}

function parseCursos(params) {
  const cursos = [];
  for (const [key, value] of params.entries()) {
    const match = key.match(/^cursos\[(\d+)\]\[(\w+)\]$/);
    if (!match) continue;
    const idx  = parseInt(match[1]);
    const prop = match[2];
    if (!cursos[idx]) cursos[idx] = {};
    cursos[idx][prop] = value;
  }
  return cursos.filter(Boolean);
}

function clipText(font, text, size, maxPx) {
  let t = text;
  while (font.widthOfTextAtSize(t, size) > maxPx && t.length > 4)
    t = t.slice(0, -4) + '...';
  return t;
}

// FRENTE - curso unico
async function drawFrontSingle({ page, fonts, aluno, curso, horas, palestrante, local, dataTexto }) {
  const W = page.getWidth();
  const H = page.getHeight();
  const { regular, bold, italic } = fonts;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });
  accentBars(page);
  drawBorder(page);

  centerText(page, bold,    'SECRETARIA MUNICIPAL DE EDUCACAO', H - 55, 11, C.navy);
  centerText(page, regular, 'PREFEITURA MUNICIPAL DE VACARIA - RS', H - 70, 9, C.gray);
  page.drawRectangle({ x: W/2 - 60, y: H - 82, width: 120, height: 1.5, color: C.gold });

  centerText(page, bold,   'CERTIFICADO', H - 130, 44, C.navy);
  centerText(page, italic, 'de Conclusao', H - 156, 16, C.gold);
  hLine(page, H - 168, C.gold, 1);

  const bodyY = H - 210;
  const lh = 27;

  centerText(page, regular, 'Certificamos que', bodyY, 14, C.gray);
  centerText(page, bold, aluno.toUpperCase(), bodyY - lh, 22, C.navy);

  const nameW = bold.widthOfTextAtSize(aluno.toUpperCase(), 22);
  page.drawLine({
    start: { x: (W - nameW) / 2, y: bodyY - lh - 5 },
    end:   { x: (W + nameW) / 2, y: bodyY - lh - 5 },
    thickness: 0.8, color: C.gold,
  });

  centerText(page, regular, 'concluiu com exito o curso', bodyY - lh*2 - 6, 14, C.gray);
  centerText(page, bold, '"' + curso + '"', bodyY - lh*3 - 6, 16, C.navyMid);
  centerText(page, regular,
    'com carga horaria de ' + horas + ' hora' + (horas != 1 ? 's' : '') + ', ministrado por ' + palestrante + '.',
    bodyY - lh*4 - 6, 13, C.black);
  centerText(page, regular,
    'Realizado em ' + local + ', ' + dataTexto + '.',
    bodyY - lh*5 - 10, 13, C.black);

  const sigY = 90;
  page.drawLine({ start: { x: W/2 - 110, y: sigY + 30 }, end: { x: W/2 + 110, y: sigY + 30 },
    thickness: 0.8, color: C.navy });
  centerText(page, bold,    'Secretaria de Educacao', sigY + 16, 10, C.navy);
  centerText(page, regular, 'Secretaria Municipal de Educacao', sigY + 4, 9, C.gray);
  centerText(page, regular, 'Vacaria / RS', sigY - 8, 9, C.gray);

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  rightText(page, regular, 'Emitido em ' + hoje, 46, 38, 8, C.lightGray);
}

// VERSO - curso unico
async function drawBackSingle({ page, fonts }) {
  const W = page.getWidth();
  const H = page.getHeight();
  const { regular, bold } = fonts;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });
  accentBars(page);
  drawBorder(page);

  centerText(page, bold, 'INFORMACOES ADICIONAIS', H - 80, 13, C.navy);
  hLine(page, H - 94, C.gold, 1);

  const paragraphs = [
    {
      title: 'Base Legal',
      text: 'Este certificado e emitido em conformidade com a Lei Federal N 13.722/2018 (Lei Lucas), que dispoe sobre a obrigatoriedade da capacitacao em nocoes basicas de Primeiros Socorros para os profissionais da educacao.',
    },
    {
      title: 'Autenticacao',
      text: 'Para verificar a autenticidade deste certificado, acesse o portal da Secretaria de Educacao e insira o codigo de verificacao impresso no campo de assinatura digital.',
    },
    {
      title: 'Observacoes',
      text: 'Este certificado nao possui valor monetario e e emitido exclusivamente para fins de comprovacao de capacitacao interna. Qualquer adulteracao ou falsificacao esta sujeita as penalidades previstas em lei.',
    },
  ];

  let y = H - 130;
  const lh = 18;
  const maxW = W - 112;

  for (const p of paragraphs) {
    page.drawText(p.title.toUpperCase(), { x: 56, y, size: 9, font: bold, color: C.gold });
    y -= lh;
    const words = p.text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (regular.widthOfTextAtSize(test, 11) > maxW) {
        page.drawText(line, { x: 56, y, size: 11, font: regular, color: C.black });
        y -= lh;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) { page.drawText(line, { x: 56, y, size: 11, font: regular, color: C.black }); y -= lh; }
    y -= 14;
    hLine(page, y + 8, C.lightGray, 0.4);
  }
}

// FRENTE - multiplos cursos
async function drawFrontMulti({ page, fonts, aluno, totalHoras }) {
  const W = page.getWidth();
  const H = page.getHeight();
  const { regular, bold, italic } = fonts;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });
  accentBars(page);
  drawBorder(page);

  centerText(page, bold,    'SECRETARIA MUNICIPAL DE EDUCACAO', H - 55, 11, C.navy);
  centerText(page, regular, 'PREFEITURA MUNICIPAL DE VACARIA - RS', H - 70, 9, C.gray);
  page.drawRectangle({ x: W/2 - 60, y: H - 82, width: 120, height: 1.5, color: C.gold });

  centerText(page, bold,   'CERTIFICADO', H - 130, 44, C.navy);
  centerText(page, italic, 'de Participacao em Multiplos Cursos', H - 156, 14, C.gold);
  hLine(page, H - 168, C.gold, 1);

  const bodyY = H - 210;
  const lh = 27;

  centerText(page, regular, 'Certificamos que', bodyY, 14, C.gray);
  centerText(page, bold, aluno.toUpperCase(), bodyY - lh, 22, C.navy);

  const nameW = bold.widthOfTextAtSize(aluno.toUpperCase(), 22);
  page.drawLine({
    start: { x: (W - nameW) / 2, y: bodyY - lh - 5 },
    end:   { x: (W + nameW) / 2, y: bodyY - lh - 5 },
    thickness: 0.8, color: C.gold,
  });

  centerText(page, regular, 'participou e concluiu com exito os cursos descritos no verso deste certificado,', bodyY - lh*2 - 6, 13, C.black);
  centerText(page, regular, 'totalizando ' + totalHoras + ' horas de capacitacao.', bodyY - lh*3 - 6, 13, C.black);

  // Caixa "ver verso"
  page.drawRectangle({ x: W/2 - 140, y: bodyY - lh*5 - 30, width: 280, height: 28, color: C.navy });
  centerText(page, bold, '>> DETALHAMENTO DOS CURSOS NO VERSO <<', bodyY - lh*5 - 18, 9.5, C.gold);

  const sigY = 90;
  page.drawLine({ start: { x: W/2 - 110, y: sigY + 30 }, end: { x: W/2 + 110, y: sigY + 30 },
    thickness: 0.8, color: C.navy });
  centerText(page, bold,    'Secretaria de Educacao', sigY + 16, 10, C.navy);
  centerText(page, regular, 'Secretaria Municipal de Educacao', sigY + 4, 9, C.gray);
  centerText(page, regular, 'Vacaria / RS', sigY - 8, 9, C.gray);

  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  rightText(page, regular, 'Emitido em ' + hoje, 46, 38, 8, C.lightGray);
}

// VERSO - multiplos cursos
async function drawBackMulti({ page, fonts, cursos }) {
  const W = page.getWidth();
  const H = page.getHeight();
  const { regular, bold } = fonts;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });
  accentBars(page);
  drawBorder(page);

  centerText(page, bold, 'CURSOS REALIZADOS', H - 80, 13, C.navy);
  hLine(page, H - 94, C.gold, 1);

  // Cabecalho da tabela
  const col1 = 56, col2 = 290, col3 = 490, col4 = 620;
  let y = H - 116;
  const rowH = 22;

  page.drawRectangle({ x: 44, y: y - 4, width: W - 88, height: rowH + 2, color: C.navy });
  page.drawText('CURSO / TREINAMENTO', { x: col1, y, size: 8, font: bold, color: C.gold });
  page.drawText('INSTRUTOR',           { x: col2, y, size: 8, font: bold, color: C.gold });
  page.drawText('PERIODO',             { x: col3, y, size: 8, font: bold, color: C.gold });
  page.drawText('CH',                  { x: col4, y, size: 8, font: bold, color: C.gold });
  y -= rowH + 6;

  for (let i = 0; i < cursos.length; i++) {
    const c = cursos[i];
    const nome      = c.nome      || '-';
    const instrutor = c.instrutor || '-';
    const inicio    = formatDate(c.inicio);
    const fim       = formatDate(c.fim);
    const periodo   = fim ? inicio + ' a ' + fim : inicio;
    const horas     = c.horas     || '-';

    const bgColor = i % 2 === 0 ? C.offWhite : C.rowAlt;
    page.drawRectangle({ x: 44, y: y - 4, width: W - 88, height: rowH, color: bgColor });

    page.drawText(clipText(regular, nome,      10, col2 - col1 - 8), { x: col1, y: y + 4, size: 10, font: regular, color: C.black });
    page.drawText(clipText(regular, instrutor,  9, col3 - col2 - 8), { x: col2, y: y + 4, size: 9,  font: regular, color: C.gray  });
    page.drawText(clipText(regular, periodo,    9, col4 - col3 - 8), { x: col3, y: y + 4, size: 9,  font: regular, color: C.gray  });
    page.drawText(horas + 'h',                                        { x: col4, y: y + 4, size: 10, font: bold,    color: C.navy  });

    y -= rowH + 2;
    if (y < 80) break;
  }

  // Total
  const totalH = cursos.reduce((s, c) => s + (parseInt(c.horas) || 0), 0);
  hLine(page, y + 8, C.gold, 0.8);
  page.drawText('CARGA HORARIA TOTAL:', { x: col3, y: y - 6, size: 9,  font: bold, color: C.navy });
  page.drawText(totalH + 'h',           { x: col4, y: y - 6, size: 11, font: bold, color: C.gold });

  hLine(page, 84, C.lightGray, 0.4);
  page.drawText(
    'Este documento e assinado digitalmente e tem validade legal nos termos da legislacao vigente.',
    { x: 56, y: 70, size: 8, font: regular, color: C.lightGray }
  );
}

// Handler principal
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  let body = '';
  for await (const chunk of req) body += chunk;
  const params = new URLSearchParams(body);

  const modo  = params.get('modo') || 'single';
  const aluno = params.get('aluno') || '';

  try {
    const pdfDoc  = await PDFDocument.create();
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fonts   = { regular, bold, italic };

    const frontPage = pdfDoc.addPage([842, 595]);
    const backPage  = pdfDoc.addPage([842, 595]);

    if (modo === 'multi') {
      const cursos     = parseCursos(params);
      const totalHoras = cursos.reduce((s, c) => s + (parseInt(c.horas) || 0), 0);

      await drawFrontMulti({ page: frontPage, fonts, aluno, totalHoras });
      await drawBackMulti({ page: backPage, fonts, cursos });
    } else {
      const curso       = params.get('curso')       || '';
      const palestrante = params.get('palestrante') || '';
      const horas       = params.get('horas')       || '';
      const data_inicio = params.get('data_inicio') || '';
      const data_fim    = params.get('data_fim')    || '';
      const local       = params.get('local')       || '';

      const fmtInicio = formatDate(data_inicio);
      const fmtFim    = formatDate(data_fim);
      const dataTexto = fmtFim
        ? 'de ' + fmtInicio + ' a ' + fmtFim
        : 'na data de ' + fmtInicio;

      await drawFrontSingle({ page: frontPage, fonts, aluno, curso, horas, palestrante, local, dataTexto });
      await drawBackSingle({ page: backPage, fonts });
    }

    pdflibAddPlaceholder({
      pdfDoc,
      reason: 'Emissao de Certificado Oficial',
      contactInfo: 'smed@vacaria.rs.gov.br',
      name: 'Secretaria de Educacao',
      location: 'Vacaria, RS',
      signatureLength: 16384,
    });

    const pdfWithPlaceholder = await pdfDoc.save();
    const p12Buffer = await fs.readFile(path.join(__dirname, 'certificate.p12'));
    const signer    = new P12Signer(p12Buffer, { passphrase: '123456' });
    const signedPdf = await signpdf.sign(pdfWithPlaceholder, signer);

    const filename = 'certificado-' + aluno.replace(/\s+/g, '-').toLowerCase() + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.setHeader('Content-Length', signedPdf.length);
    res.end(signedPdf);

  } catch (err) {
    console.error('Erro ao gerar certificado:', err);
    res.status(500).send('Erro ao gerar o certificado: ' + err.message);
  }
};
