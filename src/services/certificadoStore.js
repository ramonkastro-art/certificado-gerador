// src/services/certificadoStore.js
// ══════════════════════════════════════════════════════════════
//  Armazenamento de certificados emitidos
//
//  Usa o Vercel KV (Redis) para persistir os dados.
//  Para ativar: vá em vercel.com → seu projeto → Storage → Create KV
//  e adicione as variáveis de ambiente automaticamente.
//
//  Instale: npm install @vercel/kv
// ══════════════════════════════════════════════════════════════

let kv;

function getKV() {
  if (!kv) {
    try {
      kv = require('@vercel/kv');
    } catch (err) {
      throw new Error(
        'Vercel KV não instalado. Execute: npm install @vercel/kv\n' +
        'E ative o KV Store em vercel.com → seu projeto → Storage.'
      );
    }
  }
  return kv;
}

/**
 * Salva os dados de um certificado emitido.
 * @param {string} codigo  - Código de verificação (ex: "3748-9CA9")
 * @param {object} dados   - Dados do certificado
 */
async function salvarCertificado(codigo, dados) {
  const store = getKV();
  // TTL de 10 anos em segundos
  const DEZ_ANOS = 60 * 60 * 24 * 365 * 10;
  await store.set(`cert:${codigo}`, JSON.stringify(dados), { ex: DEZ_ANOS });
  console.log(`[certificadoStore] Salvo: ${codigo}`);
}

/**
 * Busca os dados de um certificado pelo código.
 * @param {string} codigo
 * @returns {object|null}
 */
async function buscarCertificado(codigo) {
  const store = getKV();
  const raw = await store.get(`cert:${codigo}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

module.exports = { salvarCertificado, buscarCertificado };
