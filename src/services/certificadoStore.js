// src/services/certificadoStore.js
const { kv } = require('@vercel/kv');

const DEZ_ANOS = 60 * 60 * 24 * 365 * 10;
const LIMITE_LISTAGEM = 1000;

async function salvarCertificado(codigo, dados) {
  const registro = { ...dados, status: 'pendente', criadoEm: new Date().toISOString() };
  await kv.set(`cert:${codigo}`, JSON.stringify(registro), { ex: DEZ_ANOS });
  await kv.lpush('lista:pendentes', codigo);
  console.log(`[certificadoStore] Salvo como pendente: ${codigo}`);
}

async function buscarCertificado(codigo) {
  const raw = await kv.get(`cert:${codigo}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

async function atualizarStatus(codigo, status) {
  const cert = await buscarCertificado(codigo);
  if (!cert) return null;

  cert.status = status;
  cert.atualizadoEm = new Date().toISOString();
  await kv.set(`cert:${codigo}`, JSON.stringify(cert), { ex: DEZ_ANOS });

  await kv.lrem('lista:pendentes', 0, codigo);
  await kv.lrem('lista:aprovados', 0, codigo);
  await kv.lrem('lista:rejeitados', 0, codigo);

  if (status === 'aprovado')      await kv.lpush('lista:aprovados', codigo);
  else if (status === 'rejeitado') await kv.lpush('lista:rejeitados', codigo);
  else if (status === 'pendente')  await kv.lpush('lista:pendentes', codigo);

  return cert;
}

/**
 * Atualiza o status de VÁRIOS certificados de uma vez.
 * Usado pelo botão "Aprovar todos" / "Rejeitar selecionados".
 * @param {string[]} codigos
 * @param {string} status - 'aprovado' | 'rejeitado'
 * @returns {Promise<{sucesso: string[], falha: string[]}>}
 */
async function atualizarStatusEmLote(codigos, status) {
  const sucesso = [];
  const falha = [];

  // Processa em paralelo, mas em grupos de 20 para não sobrecarregar o Redis
  const TAMANHO_GRUPO = 20;
  for (let i = 0; i < codigos.length; i += TAMANHO_GRUPO) {
    const grupo = codigos.slice(i, i + TAMANHO_GRUPO);
    const resultados = await Promise.allSettled(
      grupo.map(codigo => atualizarStatus(codigo, status))
    );
    resultados.forEach((r, idx) => {
      if (r.status === 'fulfilled' && r.value) {
        sucesso.push(grupo[idx]);
      } else {
        falha.push(grupo[idx]);
      }
    });
  }

  return { sucesso, falha };
}

async function listarPendentes() {
  const codigos = await kv.lrange('lista:pendentes', 0, LIMITE_LISTAGEM - 1);
  if (!codigos || codigos.length === 0) return [];
  const certs = await Promise.all(
    codigos.map(async (codigo) => {
      const cert = await buscarCertificado(codigo);
      return cert ? { codigo, ...cert } : null;
    })
  );
  return certs.filter(c => c && c.status === 'pendente');
}

async function listarTodos() {
  const pendentes  = await kv.lrange('lista:pendentes', 0, LIMITE_LISTAGEM - 1)  || [];
  const aprovados  = await kv.lrange('lista:aprovados', 0, LIMITE_LISTAGEM - 1)  || [];
  const rejeitados = await kv.lrange('lista:rejeitados', 0, LIMITE_LISTAGEM - 1) || [];
  const todos = [...new Set([...pendentes, ...aprovados, ...rejeitados])];

  const certs = await Promise.all(
    todos.map(async (codigo) => {
      const cert = await buscarCertificado(codigo);
      return cert ? { codigo, ...cert } : null;
    })
  );
  return certs.filter(Boolean).sort((a, b) =>
    new Date(b.criadoEm) - new Date(a.criadoEm)
  );
}

module.exports = {
  salvarCertificado,
  buscarCertificado,
  atualizarStatus,
  atualizarStatusEmLote,
  listarPendentes,
  listarTodos,
};
