// src/services/certificadoStore.js
// ══════════════════════════════════════════════════════════════
//  Armazenamento de certificados usando @vercel/kv (Upstash Redis)
// ══════════════════════════════════════════════════════════════

const { kv } = require('@vercel/kv');

const DEZ_ANOS = 60 * 60 * 24 * 365 * 10;

/**
 * Salva os dados de um certificado emitido.
 * @param {string} codigo - Código de verificação (ex: "3748-9CA9")
 * @param {object} dados  - Dados do certificado
 */
async function salvarCertificado(codigo, dados) {
  await kv.set(`cert:${codigo}`, JSON.stringify(dados), { ex: DEZ_ANOS });
  console.log(`[certificadoStore] Salvo: ${codigo}`);
}

/**
 * Busca os dados de um certificado pelo código.
 * @param {string} codigo
 * @returns {object|null}
 */
async function buscarCertificado(codigo) {
  const raw = await kv.get(`cert:${codigo}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

module.exports = { salvarCertificado, buscarCertificado };
