// api/verificar-certificado.js
// ══════════════════════════════════════════════════════════════
//  Consulta um certificado pelo código de verificação
//  GET /api/verificar-certificado?codigo=XXXX-XXXX
// ══════════════════════════════════════════════════════════════

const { buscarCertificado } = require('../src/services/certificadoStore');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { codigo } = req.query;

  if (!codigo) {
    return res.status(400).json({ error: 'Código não informado' });
  }

  try {
    const cert = await buscarCertificado(codigo);
    if (!cert) {
      return res.status(404).json({ error: 'Certificado não encontrado' });
    }
    return res.status(200).json(cert);
  } catch (err) {
    console.error('[verificar-certificado]', err);
    return res.status(500).json({ error: 'Erro ao consultar certificado' });
  }
};
