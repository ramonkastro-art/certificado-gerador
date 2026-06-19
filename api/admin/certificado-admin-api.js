// api/admin/certificado.js
// POST /api/admin/certificado
// Body: { senha, codigo, acao } onde acao = 'aprovar' | 'rejeitar'

const { atualizarStatus, listarPendentes, listarTodos } = require('../../src/services/certificadoStore');

const ADMIN_SENHA = process.env.ADMIN_SENHA || 'smed2024';

module.exports = async function handler(req, res) {
  // GET — lista certificados para o painel
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

  // POST — aprovar ou rejeitar
  if (req.method === 'POST') {
    const { senha, codigo, acao } = req.body;

    if (senha !== ADMIN_SENHA) {
      return res.status(401).json({ error: 'Senha incorreta' });
    }
    if (!codigo) {
      return res.status(400).json({ error: 'Código não informado' });
    }
    if (acao !== 'aprovar' && acao !== 'rejeitar') {
      return res.status(400).json({ error: 'Ação deve ser "aprovar" ou "rejeitar"' });
    }

    try {
      const novoStatus = acao === 'aprovar' ? 'aprovado' : 'rejeitado';
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
