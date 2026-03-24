'use strict';

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs   = require('fs');
const path = require('path');

// ══════════════════════════════════════════════════════════════
//  PALETA DE CORES
// ══════════════════════════════════════════════════════════════
const COR = {
  verde:   rgb(0.102, 0.361, 0.180),   // #1a5c2e
  verdeM:  rgb(0.180, 0.490, 0.275),   // #2e7d46
  dourado: rgb(0.788, 0.659, 0.298),   // #c9a84c
  preto:   rgb(0.173, 0.173, 0.173),   // #2c2c2c
  cinza:   rgb(0.400, 0.400, 0.400),   // #666666
  cinzaC:  rgb(0.820, 0.820, 0.820),   // #d1d1d1
  branco:  rgb(1.000, 1.000, 1.000),
  fundo:   rgb(0.997, 0.994, 0.988),   // off-white quente
  verdeBg: rgb(0.945, 0.976, 0.953),   // fundo linha total
};

// ══════════════════════════════════════════════════════════════
//  DIMENSÕES — A4 PAISAGEM (pontos)
// ══════════════════════════════════════════════════════════════
const W = 841.89;
const H = 595.28;

// ══════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════════════
function fmtData(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  const M = [
    'janeiro','fevereiro','março','abril','maio','junho',
    'julho','agosto','setembro','outubro','novembro','dezembro',
  ];
  return `${+d} de ${M[+m - 1]} de ${y}`;
}

function fmtCurta(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

/** Centraliza texto na largura total da página */
function centro(page, text, font, size, y, cor = COR.preto) {
  const x = (W - font.widthOfTextAtSize(text, size)) / 2;
  page.drawText(text, { x, y, font, size, color: cor });
}

/** Centraliza texto dentro de um bloco (x, largura) */
function centroBloco(page, text, font, size, y, bx, bw, cor = COR.preto) {
  const x = bx + (bw - font.widthOfTextAtSize(text, size)) / 2;
  page.drawText(text, { x, y, font, size, color: cor });
}

/** Trunca texto ao caber em maxWidth com a fonte/size dados */
function truncar(text, font, size, maxWidth) {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

function linha(page, x1, y1, x2, y2, cor, thickness = 0.6) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end:   { x: x2, y: y2 },
    thickness,
    color: cor,
  });
}

// ══════════════════════════════════════════════════════════════
//  CARREGAR FONTES
//  Tenta fontes TTF em /fonts — fallback para StandardFonts
//  (StandardFonts NÃO suportam acentos; instale as TTFs!)
// ══════════════════════════════════════════════════════════════
async function carregarFontes(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);

  const dir = process.cwd();

  const ler = (nome) => {
    try   { return fs.readFileSync(path.join(dir, nome)); }
    catch { return null; }
  };

  const embutir = async (bytes, fallback) =>
    bytes ? pdfDoc.embedFont(bytes) : pdfDoc.embedFont(fallback);

  return {
    regular:    await embutir(ler('CormorantGaramond-Regular.ttf'),    StandardFonts.TimesRoman),
    bold:       await embutir(ler('CormorantGaramond-Bold.ttf'),       StandardFonts.TimesRomanBold),
    italic:     await embutir(ler('CormorantGaramond-Italic.ttf'),     StandardFonts.TimesRomanItalic),
    boldItalic: await embutir(ler('CormorantGaramond-BoldItalic.ttf'), StandardFonts.TimesRomanBoldItalic),
    sans:       await embutir(ler('OpenSans-Regular.ttf'),             StandardFonts.Helvetica),
    sansBold:   await embutir(ler('OpenSans-Bold.ttf'),                StandardFonts.HelveticaBold),
  };
}

// ══════════════════════════════════════════════════════════════
//  ELEMENTOS VISUAIS REUTILIZÁVEIS
// ══════════════════════════════════════════════════════════════
function desenharBorda(page) {
  // Borda externa dourada
  page.drawRectangle({
    x: 16, y: 16,
    width: W - 32, height: H - 32,
    borderColor: COR.dourado,
    borderWidth: 2.5,
  });
  // Borda interna fina
  page.drawRectangle({
    x: 24, y: 24,
    width: W - 48, height: H - 48,
    borderColor: COR.dourado,
    borderWidth: 0.5,
    opacity: 0.6,
  });
  // Cantos
  const pontos = [[16,16],[W-16,16],[16,H-16],[W-16,H-16]];
  for (const [cx,cy] of pontos) {
    page.drawCircle({ x: cx, y: cy, size: 4, color: COR.dourado });
  }
}

function desenharMarcaDagua(page, f) {
  page.drawText('★', {
    x: W / 2 - 70, y: H / 2 - 70,
    font: f.bold, size: 200,
    color: COR.verde, opacity: 0.022,
  });
}

function desenharCabecalho(page, f) {
  const y = H - 52;
  linha(page, 56, y + 14, W - 56, y + 14, COR.dourado, 0.4);
  centro(page, 'PREFEITURA MUNICIPAL DE VACARIA', f.sans, 7, y, COR.cinza);
  centro(page, 'SECRETARIA MUNICIPAL DE EDUCAÇÃO', f.sansBold, 9.5, y - 13, COR.verde);
  centro(page, 'Vacaria — Rio Grande do Sul', f.sans, 7, y - 24, COR.cinza);
  linha(page, 56, y - 34, W - 56, y - 34, COR.dourado, 0.4);
  return y - 34; // retorna y base após cabeçalho
}

function desenharTitulo(page, f, yBase) {
  const y = yBase - 40;
  centro(page, 'C  E  R  T  I  F  I  C  A  D  O', f.bold, 26, y, COR.verde);
  // Divisor ornamental
  const mid = W / 2;
  linha(page, mid - 130, y - 9, mid - 12, y - 9, COR.dourado, 0.8);
  page.drawText('✦', { x: mid - 5, y: y - 13, font: f.regular, size: 9, color: COR.dourado });
  linha(page, mid + 12, y - 9, mid + 130, y - 9, COR.dourado, 0.8);
  return y - 14;
}

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

// ══════════════════════════════════════════════════════════════
//  CERTIFICADO INDIVIDUAL
// ══════════════════════════════════════════════════════════════
async function gerarIndividual(d) {
  const pdfDoc = await PDFDocument.create();
  const f = await carregarFontes(pdfDoc);

  const page = pdfDoc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COR.fundo });

  desenharBorda(page);
  desenharMarcaDagua(page, f);

  const yPosC = desenharCabecalho(page, f);
  const yPosT = desenharTitulo(page, f, yPosC);

  let y = yPosT - 16;

  centro(page, 'Certificamos que', f.italic, 10.5, y, COR.cinza);
  y -= 24;

  centro(page, d.nome, f.boldItalic, 22, y, COR.verde);
  y -= 18;

  if (d.cargo) {
    const cargoStr = `${d.cargo}${d.matricula ? '  —  Matrícula: ' + d.matricula : ''}`;
    centro(page, cargoStr, f.sans, 9, y, COR.cinza);
    y -= 16;
  }

  centro(page, 'concluiu com aproveitamento o curso', f.regular, 11, y, COR.preto);
  y -= 22;

  centro(page, d.curso, f.bold, 17, y, COR.verde);
  y -= 16;

  linha(page, W / 2 - 110, y, W / 2 + 110, y, COR.cinzaC, 0.5);
  y -= 14;

  // Detalhes em linha única
  const dets = [
    d.horas      ? `Carga Horária: ${d.horas} horas` : null,
    d.periodo    ? `Período: ${d.periodo}`            : null,
    d.modalidade ? `Modalidade: ${d.modalidade}`      : null,
    d.local      ? `Local: ${d.local}`                : null,
  ].filter(Boolean);

  if (dets.length > 0) {
    centro(page, dets.join('   ·   '), f.sans, 8.5, y, COR.cinza);
    y -= 14;
  }

  if (d.instrutor) {
    const instrStr = `Ministrado por ${d.instrutor}${d.instrCargo ? '  —  ' + d.instrCargo : ''}`;
    centro(page, instrStr, f.italic, 9, y, COR.cinza);
  }

  desenharRodape(page, f, d.prefeito, d.secretario, d.dataEmissao);

  return pdfDoc.save();
}

// ══════════════════════════════════════════════════════════════
//  CERTIFICADO ANUAL  (frente + verso na mesma pasta PDF)
// ══════════════════════════════════════════════════════════════
async function gerarAnual(d) {
  const pdfDoc = await PDFDocument.create();
  const f = await carregarFontes(pdfDoc);

  const totalHoras = (d.cursos || []).reduce((s, c) => s + (parseInt(c.horas) || 0), 0);

  // ── FRENTE ────────────────────────────────────────────────
  const pgF = pdfDoc.addPage([W, H]);
  pgF.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COR.fundo });
  desenharBorda(pgF);
  desenharMarcaDagua(pgF, f);

  const yCF = desenharCabecalho(pgF, f);
  const yTF = desenharTitulo(pgF, f, yCF);

  let y = yTF - 16;

  centro(pgF, 'Certificamos que o(a) servidor(a)', f.italic, 10.5, y, COR.cinza);
  y -= 24;

  centro(pgF, d.nome, f.boldItalic, 22, y, COR.verde);
  y -= 18;

  if (d.cargo) {
    const cargoStr = `${d.cargo}${d.matricula ? '  —  Matrícula: ' + d.matricula : ''}`;
    centro(pgF, cargoStr, f.sans, 9, y, COR.cinza);
    y -= 16;
  }

  centro(pgF, 'concluiu com aproveitamento as capacitações e formações continuadas', f.regular, 11, y, COR.preto);
  y -= 16;
  centro(pgF, `promovidas pela Secretaria Municipal de Educação no ${d.periodoTexto},`, f.regular, 11, y, COR.preto);
  y -= 16;
  centro(pgF, 'totalizando uma carga horária de:', f.regular, 11, y, COR.preto);
  y -= 32;

  // Total de horas em destaque
  const horasStr = `${totalHoras} horas`;
  centro(pgF, horasStr, f.bold, 28, y, COR.verde);
  y -= 20;

  centro(pgF, 'A relação completa dos cursos consta no verso deste certificado.', f.italic, 8.5, y, COR.cinza);

  desenharRodape(pgF, f, d.prefeito, d.secretario, d.dataEmissao);

  // ── VERSO ─────────────────────────────────────────────────
  const pgV = pdfDoc.addPage([W, H]);
  pgV.drawRectangle({ x: 0, y: 0, width: W, height: H, color: COR.fundo });
  desenharBorda(pgV);

  let yV = H - 48;

  centro(pgV, 'RELAÇÃO DE CURSOS REALIZADOS', f.sansBold, 10, yV, COR.verde);
  yV -= 14;

  const subtitulo = `${d.nome}${d.cargo ? '  —  ' + d.cargo : ''}   ·   ${d.periodoTexto}`;
  centro(pgV, subtitulo, f.sans, 8, yV, COR.cinza);
  yV -= 8;
  linha(pgV, 50, yV, W - 50, yV, COR.dourado, 0.7);
  yV -= 4;

  // Definição das colunas
  const COLS = [
    { label: '#',             x:  52, w:  22, align: 'center' },
    { label: 'CURSO / TREINAMENTO', x:  78, w: 315, align: 'left'   },
    { label: 'C.H.',          x: 397, w:  44, align: 'center' },
    { label: 'PERÍODO',       x: 445, w: 110, align: 'center' },
    { label: 'MODALIDADE',    x: 559, w:  78, align: 'center' },
    { label: 'LOCAL / INSTITUIÇÃO', x: 641, w: 152, align: 'left'   },
  ];

  const ROW_H = 17;
  const TABLE_X = 50;
  const TABLE_W = W - 100;

  // Header da tabela
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

  // Linhas dos cursos
  const cursos = d.cursos || [];
  for (let i = 0; i < cursos.length; i++) {
    const c = cursos[i];
    const bg = i % 2 === 0 ? COR.branco : COR.verdeBg;

    pgV.drawRectangle({
      x: TABLE_X, y: yV - ROW_H + 4,
      width: TABLE_W, height: ROW_H,
      color: bg,
    });

    const periodo = c.inicio && c.fim
      ? `${fmtCurta(c.inicio)} a ${fmtCurta(c.fim)}`
      : c.inicio ? fmtCurta(c.inicio) : '—';

    const nomeTrunc = truncar(c.nome || '—', f.sans, 8, COLS[1].w - 4);
    const localTrunc = truncar(c.local || '—', f.sans, 8, COLS[5].w - 4);

    const celulas = [
      { col: COLS[0], text: String(i + 1),       font: f.sansBold, size: 8 },
      { col: COLS[1], text: nomeTrunc,            font: f.sans,     size: 8 },
      { col: COLS[2], text: c.horas ? `${c.horas}h` : '—', font: f.sansBold, size: 8 },
      { col: COLS[3], text: periodo,              font: f.sans,     size: 7.5 },
      { col: COLS[4], text: c.modalidade || '—', font: f.sans,     size: 7.5 },
      { col: COLS[5], text: localTrunc,           font: f.sans,     size: 7.5 },
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

    // Linha separadora
    linha(pgV, TABLE_X, yV - ROW_H + 4, TABLE_X + TABLE_W, yV - ROW_H + 4, COR.cinzaC, 0.3);
    yV -= ROW_H;
  }

  // Linha de total
  pgV.drawRectangle({
    x: TABLE_X, y: yV - ROW_H + 4,
    width: TABLE_W, height: ROW_H,
    color: COR.verdeBg,
    borderColor: COR.verde,
    borderWidth: 0.5,
  });

  const totalLabel = 'Total de Horas de Formação:';
  pgV.drawText(totalLabel, {
    x: COLS[1].x, y: yV - ROW_H + 7,
    font: f.sansBold, size: 8, color: COR.verde,
  });

  const totalStr = `${totalHoras}h`;
  const totalTW = f.sansBold.widthOfTextAtSize(totalStr, 9);
  pgV.drawText(totalStr, {
    x: COLS[2].x + (COLS[2].w - totalTW) / 2, y: yV - ROW_H + 7,
    font: f.sansBold, size: 9, color: COR.verde,
  });

  yV -= ROW_H + 16;

  // Assinatura no verso
  const assX = W - 82 - 200;
  linha(pgV, assX, yV, assX + 200, yV, COR.preto, 0.5);
  centroBloco(pgV, d.secretario, f.sansBold, 8, yV - 10, assX, 200, COR.preto);
  centroBloco(pgV, 'Secretário(a) Municipal de Educação', f.sans, 7.5, yV - 20, assX, 200, COR.cinza);

  return pdfDoc.save();
}

// ══════════════════════════════════════════════════════════════
//  HANDLER SERVERLESS (Vercel)
// ══════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const b = req.body;
    const hoje = fmtData(new Date().toISOString().split('T')[0]);

    let pdfBytes;
    let nomeArquivo;

    if (b.tipo === 'anual') {
      // ── ANUAL ──────────────────────────────────────────────
      const anoI = b.periodoInicio ? b.periodoInicio.split('-')[0] : '';
      const anoF = b.periodoFim    ? b.periodoFim.split('-')[0]    : '';

      const periodoTexto = anoI && anoF
        ? (anoI === anoF
            ? `exercício de ${anoI}`
            : `período de ${anoI} a ${anoF}`)
        : anoI
          ? `exercício de ${anoI}`
          : 'período de referência';

      pdfBytes = await gerarAnual({
        nome:         b.nome        || 'Servidor(a)',
        cargo:        b.cargo       || '',
        matricula:    b.matricula   || '',
        periodoTexto,
        cursos:       Array.isArray(b.cursos) ? b.cursos : [],
        secretario:   b.secretario  || 'Secretário(a) Municipal de Educação',
        prefeito:     b.prefeito    || 'Prefeito(a) Municipal',
        dataEmissao:  hoje,
      });

      const nomeSlug = (b.nome || 'servidor').replace(/\s+/g, '_');
      nomeArquivo = `Certificado_Anual_${nomeSlug}_${anoI || 'ref'}.pdf`;

    } else {
      // ── INDIVIDUAL ─────────────────────────────────────────
      const periodo = b.dataInicio && b.dataFim
        ? `${fmtCurta(b.dataInicio)} a ${fmtCurta(b.dataFim)}`
        : b.dataInicio
          ? `a partir de ${fmtCurta(b.dataInicio)}`
          : '';

      pdfBytes = await gerarIndividual({
        nome:        b.nome        || 'Servidor(a)',
        cargo:       b.cargo       || '',
        matricula:   b.matricula   || '',
        curso:       b.curso       || 'Curso',
        horas:       b.horas       || '',
        modalidade:  b.modalidade  || 'Presencial',
        periodo,
        local:       b.local       || '',
        instrutor:   b.instrutor   || '',
        instrCargo:  b.instrCargo  || '',
        secretario:  b.secretario  || 'Secretário(a) Municipal de Educação',
        prefeito:    b.prefeito    || 'Prefeito(a) Municipal',
        dataEmissao: hoje,
      });

      const nomeSlug  = (b.nome  || 'servidor').replace(/\s+/g, '_');
      const cursoSlug = (b.curso || 'curso').replace(/\s+/g, '_');
      nomeArquivo = `Certificado_${nomeSlug}_${cursoSlug}.pdf`;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('[gerar-certificado]', err);
    res.status(500).json({ error: 'Erro ao gerar certificado', detail: err.message });
  }
};
