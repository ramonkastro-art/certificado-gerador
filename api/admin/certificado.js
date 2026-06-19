// api/admin/certificado.js
// GET  /api/admin/certificado?senha=X&filtro=pendentes|todos
// POST /api/admin/certificado  Body: { senha, codigo, acao }              -> ação individual
// POST /api/admin/certificado  Body: { senha, codigos: [...], acao }      -> ação em lote

const {
  atualizarStatus,
  atualizarStatusEmLote,
  listarPendentes,
  listarTodos,
} = require('../../src/services/certificadoStore');

const ADMIN_SENHA = process.env.ADMIN_SENHA || 'smed2024';

module.exports = async function handler(req, res) {
  // ── GET — lista certificados ─────────────────────────────
  if (req.method === 'GET') {
    const { senha, filtro } = req.query;
    if (senha !== ADMIN_SENHA) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    try {
      const lista = filtro === 'todos' ? await listarTodos() : await listarPendentes();
      return res.status(200).json(lista);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST — aprovar/rejeitar (individual ou em lote) ──────
  if (req.method === 'POST') {
    const { senha, codigo, codigos, acao } = req.body;

    if (senha !== ADMIN_SENHA) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    if (acao !== 'aprovar' && acao !== 'rejeitar') {
      return res.status(400).json({ error: 'Ação deve ser "aprovar" ou "rejeitar"' });
    }

    const novoStatus = acao === 'aprovar' ? 'aprovado' : 'rejeitado';

    try {
      // ── LOTE: array de códigos ────────────────────────────
      if (Array.isArray(codigos) && codigos.length > 0) {
        if (codigos.length > 1000) {
          return res.status(400).json({ error: 'Máximo de 1000 certificados por lote' });
        }
        const resultado = await atualizarStatusEmLote(codigos, novoStatus);
        return res.status(200).json({
          ok: true,
          status: novoStatus,
          processados: resultado.sucesso.length,
          falhas: resultado.falha.length,
          detalheFalhas: resultado.falha,
        });
      }

      // ── INDIVIDUAL: um código só ──────────────────────────
      if (!codigo) {
        return res.status(400).json({ error: 'Código não informado' });
      }
      const cert = await atualizarStatus(codigo, novoStatus);
      if (!cert) {
        return res.status(404).json({ error: 'Certificado não encontrado' });
      }
      return res.status(200).json({ ok: true, status: novoStatus, cert });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
