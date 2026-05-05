// ══════════════════════════════════════════════════════════════
//  SERVIÇO DE ASSINATURA DIGITAL
// ══════════════════════════════════════════════════════════════

/**
 * Carrega certificado P12 para assinatura digital
 * (Placeholder para implementação futura)
 */
function carregarCertificado(caminhoP12, senha) {
  // TODO: Implementar carregamento e processamento do certificado P12
  // Esta função será responsável por:
  // 1. Ler o arquivo P12
  // 2. Descriptografar com a senha
  // 3. Extrair as chaves
  console.warn('[signatureService] Assinatura digital ainda não implementada');
  return null;
}

/**
 * Assina PDF com certificado digital
 * (Placeholder para implementação futura)
 */
async function assinarPDF(pdfBytes, certificado) {
  // TODO: Implementar assinatura de PDF
  // Esta função será responsável por:
  // 1. Receber os bytes do PDF
  // 2. Assinar com o certificado P12
  // 3. Retornar PDF assinado
  console.warn('[signatureService] Assinatura de PDF ainda não implementada');
  return pdfBytes; // Por enquanto retorna PDF sem assinatura
}

module.exports = {
  carregarCertificado,
  assinarPDF,
};
