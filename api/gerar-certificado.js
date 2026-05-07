require('dotenv').config();
'use strict';

const { gerarIndividual, gerarAnual } = require('../src/services/pdfService');
const { validarRequisicaoIndividual, validarRequisicaoAnual } = require('../src/utils/validator');
const { fmtData, obterDataHoje } = require('../src/utils/formatter');
const { gerarCodigoVerificacao, gerarURLVerificacao } = require('../src/utils/verificationCode');
const { salvarCertificado } = require('../src/services/certificadoStore');

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
    const hoje = fmtData(obterDataHoje());

    let pdfBytes;
    let nomeArquivo;
    let periodo      = '';
    let periodoTexto = '';

    // ── GERA CÓDIGO ÚNICO AQUI — usado tanto no PDF quanto no banco ──
    const codigoVerificacao = gerarCodigoVerificacao({
      nome:      b.nome,
      cargo:     b.cargo,
      matricula: b.matricula,
    });
    const urlVerificacao = gerarURLVerificacao(codigoVerificacao);

    if (b.tipo === 'anual') {
      // ── VALIDAÇÃO ─────────────────────────────────────────
      const validacao = validarRequisicaoAnual(b);
      if (!validacao.valido) {
        res.status(400).json({ errors: validacao.errors });
        return;
      }

      // ── PERÍODO ───────────────────────────────────────────
      const anoI = b.periodoInicio ? b.periodoInicio.split('-')[0] : '';
      const anoF = b.periodoFim    ? b.periodoFim.split('-')[0]    : '';

      periodoTexto = anoI && anoF
        ? (anoI === anoF
            ? `exercicio de ${anoI}`
            : `periodo de ${anoI} a ${anoF}`)
        : anoI
          ? `exercicio de ${anoI}`
          : 'periodo de referencia';

      // ── GERAÇÃO ANUAL — passa código e URL já gerados ─────
      pdfBytes = await gerarAnual({
        nome:              b.nome        || 'Servidor(a)',
        cargo:             b.cargo       || '',
        matricula:         b.matricula   || '',
        periodoTexto,
        cursos:            Array.isArray(b.cursos) ? b.cursos : [],
        dataEmissao:       hoje,
        codigoVerificacao,
        urlVerificacao,
      });

      const nomeSlug = (b.nome || 'servidor').replace(/\s+/g, '_');
      nomeArquivo = `Certificado_Anual_${nomeSlug}_${anoI || 'ref'}.pdf`;

    } else {
      // ── VALIDAÇÃO ─────────────────────────────────────────
      const validacao = validarRequisicaoIndividual(b);
      if (!validacao.valido) {
        res.status(400).json({ errors: validacao.errors });
        return;
      }

      // ── PERÍODO — corrigido para usar fmtData completo ────
      if (b.dataInicio && b.dataFim) {
        periodo = `${fmtData(b.dataInicio)} a ${fmtData(b.dataFim)}`;
      } else if (b.dataInicio) {
        periodo = `a partir de ${fmtData(b.dataInicio)}`;
      }

      // ── GERAÇÃO INDIVIDUAL — passa código e URL já gerados ─
      pdfBytes = await gerarIndividual({
        nome:              b.nome         || 'Servidor(a)',
        cargo:             b.cargo        || '',
        matricula:         b.matricula    || '',
        curso:             b.curso        || 'Curso',
        cargaHoraria:      b.cargaHoraria || '',
        modalidade:        b.modalidade   || 'Presencial',
        periodo,
        local:             b.local        || '',
        instrutor:         b.instrutor    || '',
        instrCargo:        b.instrCargo   || '',
        dataEmissao:       hoje,
        codigoVerificacao,
        urlVerificacao,
      });

      const nomeSlug  = (b.nome  || 'servidor').replace(/\s+/g, '_');
      const cursoSlug = (b.curso || 'curso').replace(/\s+/g, '_');
      nomeArquivo = `Certificado_${nomeSlug}_${cursoSlug}.pdf`;
    }

    // ── SALVA NO BANCO ────────────────────────────────────────
    await salvarCertificado(codigoVerificacao, {
      tipo:         b.tipo         || 'individual',
      nome:         b.nome         || '',
      cargo:        b.cargo        || '',
      matricula:    b.matricula    || '',
      curso:        b.curso        || '',
      cargaHoraria: b.cargaHoraria || '',
      modalidade:   b.modalidade   || '',
      local:        b.local        || '',
      instrutor:    b.instrutor    || '',
      instrCargo:   b.instrCargo   || '',
      cursos:       b.cursos       || [],
      periodo,
      periodoTexto,
      dataEmissao:  hoje,
    });

    // ── RESPOSTA ──────────────────────────────────────────────
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
