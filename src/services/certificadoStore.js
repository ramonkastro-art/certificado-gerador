// src/services/certificadoStore.js
const { kv } = require('@vercel/kv');

const DEZ_ANOS = 60 * 60 * 24 * 365 * 10;

async function salvarCertificado(codigo, dados) {
  // Salva sempre como pendente — aguarda aprovação do admin
  const registro = { ...dados, status: 'pendente', criadoEm: new Date().toISOString() };
  await kv.set(`cert:${codigo}`, JSON.stringify(registro), { ex: DEZ_ANOS });
  // Adiciona à lista de pendentes para o painel admin
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
  // Remove da lista de pendentes se aprovado ou rejeitado
  if (status !== 'pendente') {
    await kv.lrem('lista:pendentes', 0, codigo);
  }
  return cert;
}

async function listarPendentes() {
  const codigos = await kv.lrange('lista:pendentes', 0, -1);
  if (!codigos || codigos.length === 0) return [];
  const certs = await Promise.all(
    codigos.map(async (codigo) => {
      const cert = await buscarCertificado(codigo);
      return cert ? { codigo, ...cert } : null;
    })
  );
  // Filtra nulos e garante que só retorna os realmente pendentes
  return certs.filter(c => c && c.status === 'pendente');
}

async function listarTodos() {
  // Busca todos os certificados (pendentes + aprovados + rejeitados)
  // Limitado aos últimos 200 para performance
  const pendentes  = await kv.lrange('lista:pendentes', 0, -1);
  const aprovados  = await kv.lrange('lista:aprovados', 0, 99);
  const rejeitados = await kv.lrange('lista:rejeitados', 0, 99);
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

module.exports = { salvarCertificado, buscarCertificado, atualizarStatus, listarPendentes, listarTodos };
