// ══════════════════════════════════════════════════════════════
//  VALIDAÇÃO ROBUSTA DE ENTRADAS
// ══════════════════════════════════════════════════════════════

/**
 * Valida CPF (formato e dígitos verificadores)
 * @param {string} cpf - CPF a ser validado (com ou sem formatação)
 * @returns {boolean} true se CPF é válido
 */
function validarCPF(cpf) {
  if (!cpf) return true; // CPF é opcional
  
  // Remove formatação
  const cpfLimpo = cpf.replace(/\D/g, '');
  
  // Deve ter 11 dígitos
  if (cpfLimpo.length !== 11) return false;
  
  // Rejeita sequências iguais
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
  
  // Valida primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo[i]) * (10 - i);
  }
  let digito1 = 11 - (soma % 11);
  digito1 = digito1 > 9 ? 0 : digito1;
  
  if (parseInt(cpfLimpo[9]) !== digito1) return false;
  
  // Valida segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo[i]) * (11 - i);
  }
  let digito2 = 11 - (soma % 11);
  digito2 = digito2 > 9 ? 0 : digito2;
  
  if (parseInt(cpfLimpo[10]) !== digito2) return false;
  
  return true;
}

/**
 * Valida data em múltiplos formatos: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
 * @param {string} data - Data a ser validada
 * @returns {boolean} true se data está em formato válido
 */
function validarFormatoData(data) {
  if (!data) return true; // Data é opcional
  
  // Formato ISO (YYYY-MM-DD)
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (isoRegex.test(data)) {
    const date = new Date(data);
    return date instanceof Date && !isNaN(date);
  }
  
  // Formato DD/MM/YYYY
  const brRegex1 = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match1 = data.match(brRegex1);
  if (match1) {
    const [, dia, mes, ano] = match1;
    const date = new Date(ano, mes - 1, dia);
    return date.getDate() === parseInt(dia);
  }
  
  // Formato DD-MM-YYYY
  const brRegex2 = /^(\d{2})-(\d{2})-(\d{4})$/;
  const match2 = data.match(brRegex2);
  if (match2) {
    const [, dia, mes, ano] = match2;
    const date = new Date(ano, mes - 1, dia);
    return date.getDate() === parseInt(dia);
  }
  
  return false;
}

/**
 * Valida nome/aluno: obrigatório, mínimo 3, máximo 100 caracteres
 * @param {string} nome - Nome a ser validado
 * @param {string} fieldName - Nome do campo para mensagem de erro
 * @returns {null|string} null se válido, string com mensagem de erro se inválido
 */
function validarNome(nome, fieldName = 'nome') {
  if (!nome || typeof nome !== 'string') {
    return `${fieldName} é obrigatório`;
  }
  
  const nomeTrimmed = nome.trim();
  
  if (nomeTrimmed.length < 3) {
    return `${fieldName} deve ter pelo menos 3 caracteres`;
  }
  
  if (nomeTrimmed.length > 100) {
    return `${fieldName} não pode exceder 100 caracteres`;
  }
  
  return null;
}

/**
 * Valida curso: obrigatório, mínimo 2 caracteres
 * @param {string} curso - Curso a ser validado
 * @returns {null|string} null se válido, string com mensagem de erro se inválido
 */
function validarCurso(curso) {
  if (!curso || typeof curso !== 'string') {
    return 'curso é obrigatório';
  }
  
  const cursoTrimmed = curso.trim();
  
  if (cursoTrimmed.length < 2) {
    return 'curso deve ter pelo menos 2 caracteres';
  }
  
  return null;
}

/**
 * Valida carga horária: obrigatório, deve ser número positivo
 * @param {number|string} cargaHoraria - Carga horária a ser validada
 * @returns {null|string} null se válido, string com mensagem de erro se inválido
 */
function validarCargaHoraria(cargaHoraria) {
  if (cargaHoraria === null || cargaHoraria === undefined || cargaHoraria === '') {
    return 'cargaHoraria é obrigatória';
  }
  
  const num = parseInt(cargaHoraria, 10);
  
  if (isNaN(num)) {
    return 'cargaHoraria deve ser um número';
  }
  
  if (num <= 0) {
    return 'cargaHoraria deve ser um número positivo';
  }
  
  return null;
}

/**
 * Valida tipo: deve ser 'individual' ou 'anual'
 * @param {string} tipo - Tipo a ser validado
 * @returns {null|string} null se válido, string com mensagem de erro se inválido
 */
function validarTipo(tipo) {
  if (!tipo || typeof tipo !== 'string') {
    return 'tipo é obrigatório';
  }
  
  if (tipo !== 'individual' && tipo !== 'anual') {
    return "tipo deve ser 'individual' ou 'anual'";
  }
  
  return null;
}

/**
 * Valida array de cursos (para tipo anual)
 * @param {Array} cursos - Array de cursos
 * @returns {null|string} null se válido, string com mensagem de erro se inválido
 */
function validarArrayCursos(cursos) {
  if (!Array.isArray(cursos)) {
    return 'cursos deve ser um array';
  }
  
  if (cursos.length === 0) {
    return 'cursos não pode estar vazio';
  }
  
  for (let i = 0; i < cursos.length; i++) {
    const curso = cursos[i];
    if (!curso.nome || typeof curso.nome !== 'string' || curso.nome.trim().length === 0) {
      return `Curso no índice ${i} deve ter um campo "nome" válido`;
    }
  }
  
  return null;
}

/**
 * Valida requisição para certificado individual
 * @param {object} body - Corpo da requisição
 * @returns {object} { valido: boolean, errors: Array<{field, message}> }
 */
function validarRequisicaoIndividual(body) {
  const errors = [];
  
  // Validações obrigatórias
  const erroNome = validarNome(body.nome, 'nome');
  if (erroNome) errors.push({ field: 'nome', message: erroNome });
  
  const erroCurso = validarCurso(body.curso);
  if (erroCurso) errors.push({ field: 'curso', message: erroCurso });
  
  const erroCarga = validarCargaHoraria(body.cargaHoraria);
  if (erroCarga) errors.push({ field: 'cargaHoraria', message: erroCarga });
  
  // Validações opcionais - apenas verificar se fornecidas
  if (body.dataInicio !== undefined && body.dataInicio !== null && body.dataInicio !== '') {
    if (!validarFormatoData(body.dataInicio)) {
      errors.push({ field: 'dataInicio', message: 'dataInicio deve estar em formato válido (ISO YYYY-MM-DD, DD/MM/YYYY ou DD-MM-YYYY)' });
    }
  }
  
  if (body.dataFim !== undefined && body.dataFim !== null && body.dataFim !== '') {
    if (!validarFormatoData(body.dataFim)) {
      errors.push({ field: 'dataFim', message: 'dataFim deve estar em formato válido (ISO YYYY-MM-DD, DD/MM/YYYY ou DD-MM-YYYY)' });
    }
  }
  
  if (body.cpf !== undefined && body.cpf !== null && body.cpf !== '') {
    if (!validarCPF(body.cpf)) {
      errors.push({ field: 'cpf', message: 'cpf inválido' });
    }
  }
  
  return {
    valido: errors.length === 0,
    errors
  };
}

/**
 * Valida requisição para certificado anual
 * @param {object} body - Corpo da requisição
 * @returns {object} { valido: boolean, errors: Array<{field, message}> }
 */
function validarRequisicaoAnual(body) {
  const errors = [];
  
  // Validações obrigatórias
  const erroNome = validarNome(body.nome, 'nome');
  if (erroNome) errors.push({ field: 'nome', message: erroNome });
  
  const erroTipo = validarTipo(body.tipo);
  if (erroTipo) errors.push({ field: 'tipo', message: erroTipo });
  
  const erroCursos = validarArrayCursos(body.cursos);
  if (erroCursos) errors.push({ field: 'cursos', message: erroCursos });
  
  // Validações opcionais
  if (body.periodoInicio !== undefined && body.periodoInicio !== null && body.periodoInicio !== '') {
    if (!validarFormatoData(body.periodoInicio)) {
      errors.push({ field: 'periodoInicio', message: 'periodoInicio deve estar em formato válido (ISO YYYY-MM-DD, DD/MM/YYYY ou DD-MM-YYYY)' });
    }
  }
  
  if (body.periodoFim !== undefined && body.periodoFim !== null && body.periodoFim !== '') {
    if (!validarFormatoData(body.periodoFim)) {
      errors.push({ field: 'periodoFim', message: 'periodoFim deve estar em formato válido (ISO YYYY-MM-DD, DD/MM/YYYY ou DD-MM-YYYY)' });
    }
  }
  
  if (body.cpf !== undefined && body.cpf !== null && body.cpf !== '') {
    if (!validarCPF(body.cpf)) {
      errors.push({ field: 'cpf', message: 'cpf inválido' });
    }
  }
  
  return {
    valido: errors.length === 0,
    errors
  };
}

module.exports = {
  validarCPF,
  validarFormatoData,
  validarNome,
  validarCurso,
  validarCargaHoraria,
  validarTipo,
  validarArrayCursos,
  validarRequisicaoIndividual,
  validarRequisicaoAnual,
};
