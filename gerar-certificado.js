const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { pdflibAddPlaceholder } = require('@signpdf/placeholder-pdf-lib');
const signpdf = require('@signpdf/signpdf').default;
const { P12Signer } = require('@signpdf/signer-p12');
const fs = require('fs').promises;
const path = require('path');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const centerText = (page, font, text, y, size, color) => {
  const { width } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
};

const rightText = (page, font, text, rightMargin, y, size, color) => {
  const { width } = page.getSize();
  const textWidth = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: width - rightMargin - textWidth, y, size, font, color });
};

// ─── Colors ──────────────────────────────────────────────────────────────────
const C = {
  navy:     rgb(0.051, 0.122, 0.235),
  navyMid:  rgb(0.102, 0.196, 0.376),
  gold:     rgb(0.722, 0.588, 0.227),
  goldDark: rgb(0.545, 0.424, 0.118),
  white:    rgb(1, 1, 1),
  offWhite: rgb(0.98, 0.97, 0.95),
  gray:     rgb(0.45, 0.45, 0.45),
  lightGray:rgb(0.80, 0.78, 0.75),
  black:    rgb(0.15, 0.15, 0.15),
};

// ─── Draw ornamental border ───────────────────────────────────────────────────
function drawBorder(page, W, H) {
  const m  = 22;  // outer margin
  const m2 = 30;  // inner margin

  // Outer thick border
  page.drawRectangle({ x: m, y: m, width: W - m*2, height: H - m*2,
    borderColor: C.navy, borderWidth: 2.5, color: undefined });
  // Inner thin border
  page.drawRectangle({ x: m2, y: m2, width: W - m2*2, height: H - m2*2,
    borderColor: C.gold, borderWidth: 0.8, color: undefined });

  // Corner ornaments (small filled squares)
  const cs = 6;
  const corners = [[m,m],[W-m-cs,m],[m,H-m-cs],[W-m-cs,H-m-cs]];
  corners.forEach(([cx,cy]) =>
    page.drawRectangle({ x: cx, y: cy, width: cs, height: cs, color: C.gold }));
  // Inner corner dots
  const csi = 3.5;
  const cornersI = [[m2,m2],[W-m2-csi,m2],[m2,H-m2-csi],[W-m2-csi,H-m2-csi]];
  cornersI.forEach(([cx,cy]) =>
    page.drawRectangle({ x: cx, y: cy, width: csi, height: csi, color: C.navy }));
}

// ─── Draw a full horizontal divider line ─────────────────────────────────────
function hLine(page, W, y, color = C.lightGray, thickness = 0.5) {
  page.drawLine({ start: { x: 50, y }, end: { x: W - 50, y },
    thickness, color });
}

// ─── Parse multi-course body ──────────────────────────────────────────────────
function parseCursos(params) {
  // params is a URLSearchParams or plain object
  const cursos = [];
  // Find all keys like "cursos[N][nome]"
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

// ─── FRENTE — curso único ─────────────────────────────────────────────────────
async function drawFrontSingle({ page, fonts, aluno, curso, horas, palestrante, local, dataTexto }) {
  const { W, H } = { W: page.getWidth(), H: page.getHeight() };
  const { regular, bold, italic } = fonts;

  // Background fill
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });

  // Top accent bar
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: H - 12, width: W, height: 4, color: C.gold });

  // Bottom accent bar
  page.drawRectangle({ x: 0, y: 0, width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: 8, width: W, height: 4, color: C.gold });

  drawBorder(page, W, H);

  // Issuer name (top)
  centerText(page, bold, 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', H - 55, 11, C.navy);
  centerText(page, regular, 'PREFEITURA MUNICIPAL DE VACARIA — RS', H - 70, 9, C.gray);

  // Gold divider
  page.drawRectangle({ x: W/2 - 60, y: H - 82, width: 120, height: 1.5, color: C.gold });

  // Main title
  centerText(page, bold, 'CERTIFICADO', H - 130, 44, C.navy);
  centerText(page, italic, 'de Conclusão', H - 156, 16, C.gold);

  // Gold decorative line below title
  hLine(page, W, H - 168, C.gold, 1);

  // Body text
  const bodyY = H - 210;
  const lh = 27;

  centerText(page, regular, 'Certificamos que', bodyY, 14, C.gray);

  // Student name — large, distinguished
  centerText(page, bold, aluno.toUpperCase(), bodyY - lh, 22, C.navy);

  // Underline the name
  const nameWidth = bold.widthOfTextAtSize(aluno.toUpperCase(), 22);
  page.drawLine({
    start: { x: (W - nameWidth) / 2, y: bodyY - lh - 5 },
    end:   { x: (W + nameWidth) / 2, y: bodyY - lh - 5 },
    thickness: 0.8, color: C.gold,
  });

  centerText(page, regular, 'concluiu com êxito o curso', bodyY - lh*2 - 6, 14, C.gray);

  // Course name — italic serif feel (bold)
  centerText(page, bold, `"${curso}"`, bodyY - lh*3 - 6, 16, C.navyMid);

  centerText(page, regular,
    `com carga horária de ${horas} hora${horas != 1 ? 's' : ''}, ministrado por ${palestrante}.`,
    bodyY - lh*4 - 6, 13, C.black);

  centerText(page, regular,
    `Realizado em ${local}, ${dataTexto}.`,
    bodyY - lh*5 - 10, 13, C.black);

  // Signature area
  const sigY = 90;
  const sigX = W / 2;

  page.drawLine({ start: { x: sigX - 110, y: sigY + 30 }, end: { x: sigX + 110, y: sigY + 30 },
    thickness: 0.8, color: C.navy });
  centerText(page, bold,   'Secretária de Educação', sigY + 16, 10, C.navy);
  centerText(page, regular,'Secretaria Municipal de Educação', sigY + 4, 9, C.gray);
  centerText(page, regular,'Vacaria / RS', sigY - 8, 9, C.gray);

  // Issue date (bottom right)
  const hoje = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  rightText(page, regular, `Emitido em ${hoje}`, 46, 38, 8, C.lightGray);
}

// ─── VERSO — curso único ──────────────────────────────────────────────────────
async function drawBackSingle({ page, fonts }) {
  const { W, H } = { W: page.getWidth(), H: page.getHeight() };
  const { regular, bold } = fonts;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });
  page.drawRectangle({ x: 0, y: H - 8, width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: H - 12, width: W, height: 4, color: C.gold });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: 8, width: W, height: 4, color: C.gold });
  drawBorder(page, W, H);

  centerText(page, bold, 'INFORMAÇÕES ADICIONAIS', H - 80, 13, C.navy);
  hLine(page, W, H - 94, C.gold, 1);

  const paragraphs = [
    { title: 'Base Legal', text: 'Este certificado é emitido em conformidade com a Lei Federal N° 13.722/2018 (Lei Lucas), que dispõe sobre a obrigatoriedade da capacitação em noções básicas de Primeiros Socorros para os profissionais da educação.' },
    { title: 'Autenticação', text: 'Para verificar a autenticidade deste certificado, acesse o portal da Secretaria de Educação e insira o código de verificação impresso no campo de assinatura digital.' },
    { title: 'Observações', text: 'Este certificado não possui valor monetário e é emitido exclusivamente para fins de comprovação de capacitação interna. Qualquer adulteração ou falsificação está sujeita às penalidades previstas em lei.' },
  ];

  let y = H - 130;
  const lh = 18;
  for (const p of paragraphs) {
    page.drawText(p.title.toUpperCase(), { x: 56, y, size: 9, font: bold, color: C.gold });
    y -= lh;
    // word-wrap text
    const words = p.text.split(' ');
    let line = '';
    const maxW = W - 112;
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
    y -= 14; // spacing between paragraphs
    hLine(page, W, y + 8, C.lightGray, 0.4);
  }
}

// ─── FRENTE — múltiplos cursos ────────────────────────────────────────────────
async function drawFrontMulti({ page, fonts, aluno, palestrante, local, totalHoras, cursos }) {
  const { W, H } = { W: page.getWidth(), H: page.getHeight() };
  const { regular, bold, italic } = fonts;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });
  page.drawRectangle({ x: 0, y: H - 8,  width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: H - 12, width: W, height: 4, color: C.gold });
  page.drawRectangle({ x: 0, y: 0,      width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: 8,      width: W, height: 4, color: C.gold });
  drawBorder(page, W, H);

  centerText(page, bold, 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', H - 55, 11, C.navy);
  centerText(page, regular, 'PREFEITURA MUNICIPAL DE VACARIA — RS', H - 70, 9, C.gray);
  page.drawRectangle({ x: W/2 - 60, y: H - 82, width: 120, height: 1.5, color: C.gold });

  centerText(page, bold, 'CERTIFICADO', H - 130, 44, C.navy);
  centerText(page, italic, 'de Participação em Múltiplos Cursos', H - 156, 14, C.gold);
  hLine(page, W, H - 168, C.gold, 1);

  const bodyY = H - 210;
  const lh = 27;

  centerText(page, regular, 'Certificamos que', bodyY, 14, C.gray);
  centerText(page, bold, aluno.toUpperCase(), bodyY - lh, 22, C.navy);
  const nameWidth = bold.widthOfTextAtSize(aluno.toUpperCase(), 22);
  page.drawLine({
    start: { x: (W - nameWidth)/2, y: bodyY - lh - 5 },
    end:   { x: (W + nameWidth)/2, y: bodyY - lh - 5 },
    thickness: 0.8, color: C.gold,
  });

  centerText(page, regular, 'participou e concluiu com êxito os cursos descritos no verso deste certificado,', bodyY - lh*2 - 6, 13, C.black);
  centerText(page, regular, `totalizando ${totalHoras} horas de capacitação, ministradas por ${palestrante},`, bodyY - lh*3 - 6, 13, C.black);
  centerText(page, regular, `realizadas em ${local}.`, bodyY - lh*4 - 6, 13, C.black);

  // "See reverse" note
  page.drawRectangle({ x: W/2 - 140, y: bodyY - lh*5 - 30, width: 280, height: 28,
    color: C.navy, borderColor: undefined });
  centerText(page, bold, '▸  DETALHAMENTO DOS CURSOS NO VERSO  ◂', bodyY - lh*5 - 18, 9.5, C.gold);

  const sigY = 90;
  page.drawLine({ start: { x: W/2 - 110, y: sigY + 30 }, end: { x: W/2 + 110, y: sigY + 30 },
    thickness: 0.8, color: C.navy });
  centerText(page, bold,   'Secretária de Educação', sigY + 16, 10, C.navy);
  centerText(page, regular,'Secretaria Municipal de Educação', sigY + 4, 9, C.gray);
  centerText(page, regular,'Vacaria / RS', sigY - 8, 9, C.gray);

  const hoje = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  rightText(page, regular, `Emitido em ${hoje}`, 46, 38, 8, C.lightGray);
}

// ─── VERSO — múltiplos cursos ─────────────────────────────────────────────────
async function drawBackMulti({ page, fonts, cursos }) {
  const { W, H } = { W: page.getWidth(), H: page.getHeight() };
  const { regular, bold } = fonts;

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.offWhite });
  page.drawRectangle({ x: 0, y: H - 8,  width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: H - 12, width: W, height: 4, color: C.gold });
  page.drawRectangle({ x: 0, y: 0,      width: W, height: 8, color: C.navy });
  page.drawRectangle({ x: 0, y: 8,      width: W, height: 4, color: C.gold });
  drawBorder(page, W, H);

  centerText(page, bold, 'CURSOS REALIZADOS', H - 80, 13, C.navy);
  hLine(page, W, H - 94, C.gold, 1);

  // Table header
  const col1x = 56, col2x = 380, col3x = 500, col4x = 620;
  let y = H - 116;
  const rowH = 22;

  page.drawRectangle({ x: 44, y: y - 4, width: W - 88, height: rowH + 2, color: C.navy });
  page.drawText('CURSO / TREINAMENTO',   { x: col1x, y, size: 8, font: bold, color: C.gold });
  page.drawText('PERÍODO',               { x: col2x, y, size: 8, font: bold, color: C.gold });
  page.drawText('CH',                    { x: col3x, y, size: 8, font: bold, color: C.gold });
  y -= rowH + 6;

  // Rows
  for (let i = 0; i < cursos.length; i++) {
    const c = cursos[i];
    const nome    = c.nome   || '—';
    const inicio  = formatDate(c.inicio);
    const fim     = formatDate(c.fim);
    const periodo = fim ? `${inicio} a ${fim}` : inicio;
    const horas   = c.horas  || '—';

    const bgColor = i % 2 === 0 ? C.offWhite : rgb(0.94, 0.93, 0.90);
    page.drawRectangle({ x: 44, y: y - 4, width: W - 88, height: rowH, color: bgColor });

    // Clip long names
    let displayNome = nome;
    while (regular.widthOfTextAtSize(displayNome, 10) > (col2x - col1x - 8) && displayNome.length > 4)
      displayNome = displayNome.slice(0, -4) + '…';

    page.drawText(displayNome, { x: col1x, y: y + 4, size: 10, font: regular, color: C.black });
    page.drawText(periodo,     { x: col2x, y: y + 4, size: 9,  font: regular, color: C.gray });
    page.drawText(`${horas}h`, { x: col3x, y: y + 4, size: 10, font: bold,    color: C.navy });

    y -= rowH + 2;
    if (y < 80) break; // prevent overflow
  }

  // Total row
  const totalH = cursos.reduce((s, c) => s + (parseInt(c.horas) || 0), 0);
  hLine(page, W, y + 8, C.gold, 0.8);
  page.drawText(`CARGA HORÁRIA TOTAL:`, { x: col2x, y: y - 6, size: 9, font: bold, color: C.navy });
  page.drawText(`${totalH}h`, { x: col3x, y: y - 6, size: 11, font: bold, color: C.gold });

  // Legal note at bottom
  const noteY = 70;
  hLine(page, W, noteY + 14, C.lightGray, 0.4);
  page.drawText('Este documento é assinado digitalmente e tem validade legal nos termos da legislação vigente.',
    { x: 56, y: noteY, size: 8, font: regular, color: C.lightGray });
}

// ─── Main handler ─────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  let body = '';
  for await (const chunk of req) body += chunk;
  const params = new URLSearchParams(body);

  const modo      = params.get('modo') || 'single';
  const aluno     = params.get('aluno') || '';

  try {
    const pdfDoc   = await PDFDocument.create();
    const regular  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold     = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italic   = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const fonts    = { regular, bold, italic };

    const frontPage = pdfDoc.addPage([842, 595]); // A4 landscape
    const backPage  = pdfDoc.addPage([842, 595]);

    if (modo === 'multi') {
      const cursos      = parseCursos(params);
      const palestrante = params.get('m_palestrante') || '';
      const local       = params.get('m_local') || '';
      const totalHoras  = cursos.reduce((s, c) => s + (parseInt(c.horas) || 0), 0);

      await drawFrontMulti({ page: frontPage, fonts, aluno, palestrante, local, totalHoras, cursos });
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
        ? `de ${fmtInicio} a ${fmtFim}`
        : `na data de ${fmtInicio}`;

      await drawFrontSingle({ page: frontPage, fonts, aluno, curso, horas, palestrante, local, dataTexto });
      await drawBackSingle({ page: backPage, fonts });
    }

    // Digital signature placeholder
    pdflibAddPlaceholder({
      pdfDoc,
      reason: 'Emissão de Certificado Oficial',
      contactInfo: 'smed@vacaria.rs.gov.br',
      name: 'Secretaria de Educação',
      location: 'Vacaria, RS',
      signatureLength: 16384,
    });

    const pdfWithPlaceholder = await pdfDoc.save();
    const p12Path    = path.join(__dirname, 'certificate.p12');
    const p12Buffer  = await fs.readFile(p12Path);
    const signer     = new P12Signer(p12Buffer, { passphrase: '123456' });
    const signedPdf  = await signpdf.sign(pdfWithPlaceholder, signer);

    const filename = `certificado-${aluno.replace(/\s+/g, '-').toLowerCase()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', signedPdf.length);
    res.end(signedPdf);

  } catch (err) {
    console.error('Erro ao gerar certificado:', err);
    res.status(500).send('Erro ao gerar o certificado: ' + err.message);
  }
};
