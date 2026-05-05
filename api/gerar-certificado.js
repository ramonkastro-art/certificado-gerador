require('dotenv').config();
'use strict';

const { gerarIndividual, gerarAnual } = require('../src/services/pdfService');
const { validarRequisicaoIndividual, validarRequisicaoAnual } = require('../src/utils/validator');
const { fmtData, obterDataHoje } = require('../src/utils/formatter');
const { gerarCodigoVerificacao } = require('../src/utils/verificationCode');

// ══════════════════════════════════════════════════════════════
//  HANDLER SERVERLESS (Vercel)
//  Controller enxuto que orquestra os serviços
// ══════════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  // Verificar variáveis de ambiente
  const certificatePassword = process.env.CERTIFICATE_PASSWORD;
  if (!certificatePassword) {
    console.warn('[gerar-certificado] AVISO: CERTIFICATE_PASSWORD não está definida em .env');
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido' });
    return;
  }

  try {
    const b = req.body;
    const hoje = fmtData(obterDataHoje());

    let pdfBytes;
    let nomeArquivo;
    let codigoVerificacao;

    if (b.tipo === 'anual') {
      // ── VALIDAÇÃO ROBUSTA ──────────────────────────────────────
      const validacao = validarRequisicaoAnual(b);
      if (!validacao.valido) {
        res.status(400).json({ errors: validacao.errors });
        return;
      }

      // ── GERAÇÃO ANUAL ──────────────────────────────────────
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
      // ── VALIDAÇÃO ROBUSTA ──────────────────────────────────────
      const validacao = validarRequisicaoIndividual(b);
      if (!validacao.valido) {
        res.status(400).json({ errors: validacao.errors });
        return;
      }

      // ── GERAÇÃO INDIVIDUAL ─────────────────────────────────
      const periodo = b.dataInicio && b.dataFim
        ? `${fmtData(b.dataInicio).slice(0, 5)} a ${fmtData(b.dataFim)}`
        : b.dataInicio
          ? `a partir de ${fmtData(b.dataInicio)}`
          : '';

      pdfBytes = await gerarIndividual({
        nome:        b.nome        || 'Servidor(a)',
        cargo:       b.cargo       || '',
        matricula:   b.matricula   || '',
        curso:       b.curso       || 'Curso',
        cargaHoraria: b.cargaHoraria || '',
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

    // Gera código de verificação
    codigoVerificacao = gerarCodigoVerificacao({
      nome: b.nome,
      cargo: b.cargo,
      matricula: b.matricula,
    });

    // ── RESPOSTA ───────────────────────────────────────────────
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.setHeader('Content-Length', pdfBytes.length);
    res.setHeader('X-Verification-Code', codigoVerificacao);
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('[gerar-certificado]', err);
    res.status(500).json({ error: 'Erro ao gerar certificado', detail: err.message });
  }
};
