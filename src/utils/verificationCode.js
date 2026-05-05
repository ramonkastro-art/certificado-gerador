const crypto = require('crypto');

/**
 * Gera um código de verificação único (8 caracteres alfanuméricos)
 * @param {Object} data - Dados do certificado para gerar hash único
 * @returns {string} Código de verificação em formato XXXX-XXXX
 */
function gerarCodigoVerificacao(data) {
  // Cria um hash a partir dos dados principais
  const input = `${data.nome}${data.cargo}${data.matricula}${Date.now()}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  
  // Pega os primeiros 8 caracteres e converte para maiúsculas
  const codigo = hash.substring(0, 8).toUpperCase();
  
  // Formata como XXXX-XXXX
  return `${codigo.substring(0, 4)}-${codigo.substring(4, 8)}`;
}

/**
 * Gera uma URL de verificação fictícia
 * @param {string} codigo - Código de verificação
 * @returns {string} URL completa de verificação
 */
function gerarURLVerificacao(codigo) {
  const dominio = process.env.VERIFICATION_DOMAIN || 'https://seudominio.com';
  return `${dominio}/verificar/${codigo}`;
}

module.exports = {
  gerarCodigoVerificacao,
  gerarURLVerificacao,
};
