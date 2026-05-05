# 📋 Etapa 4: Refatoração em Módulos

**Status:** ✅ Completo

**Commit:** `6e9d504` - refactor: extrai lógica para módulos em src/utils e src/services

---

## 📁 Estrutura Criada

```
src/
├── config/
│   └── constants.js           # Constantes, cores, dimensões
├── utils/
│   ├── validator.js           # Validação de inputs
│   ├── formatter.js           # Formatação de datas
│   ├── text.js                # Centralização e truncagem de texto
│   └── drawing.js             # Funções de desenho (linhas, etc)
└── services/
    ├── fontService.js         # Carregamento de fontes TTF
    ├── pdfService.js          # Geração de certificados (individual/anual)
    ├── visualService.js       # Elementos visuais (borda, cabeçalho, etc)
    └── signatureService.js    # Assinatura digital (placeholder)
```

---

## 🔄 Refatoração do Handler

### Antes
- **Arquivo:** `api/gerar-certificado.js` (1108 linhas)
- **Problemas:**
  - Lógica misturada (constantes, utils, PDF, validação)
  - Difícil de manter e testar
  - Acoplamento alto

### Depois
- **Arquivo:** `api/gerar-certificado.js` (~115 linhas)
- **Responsabilidade:** Controller enxuto que:
  1. Recebe a requisição
  2. Valida entrada via `validator.js`
  3. Orquestra `pdfService` para geração
  4. Retorna PDF na resposta

---

## 📦 Módulos Criados

### `src/config/constants.js`
**Responsabilidade:** Centralizar constantes do projeto
```javascript
COR = { verde, dourado, preto, ... }  // Paleta de cores
W, H                                   // Dimensões A4 Paisagem
FONT_PATHS = { ... }                   // Caminhos das fontes
```

### `src/utils/validator.js`
**Responsabilidade:** Validar entrada de dados
```javascript
validarNome(nome)                      // Valida nome não vazio
validarData(data)                      // Valida formato YYYY-MM-DD
validarHoras(horas)                    // Valida horas positivas
validarRequisicaoIndividual(body)     // Valida certificado individual
validarRequisicaoAnual(body)          // Valida certificado anual
```

### `src/utils/formatter.js`
**Responsabilidade:** Formatar dados
```javascript
fmtData(str)                           // YYYY-MM-DD → "d de mês de yyyy"
fmtCurta(str)                          // YYYY-MM-DD → "dd/mm/yyyy"
obterDataHoje()                        // Retorna hoje em YYYY-MM-DD
```

### `src/utils/text.js`
**Responsabilidade:** Manipular texto na página PDF
```javascript
centro(page, text, font, size, y, cor)      // Centraliza na página
centroBloco(page, text, font, size, y, ...)  // Centraliza em bloco
truncar(text, font, size, maxWidth)         // Trunca com "…"
```

### `src/utils/drawing.js`
**Responsabilidade:** Primitivas de desenho
```javascript
linha(page, x1, y1, x2, y2, cor)    // Desenha linha
```

### `src/services/fontService.js`
**Responsabilidade:** Carregar e embutir fontes TTF
```javascript
carregarFontes(pdfDoc)  // Retorna objeto com 6 fontes (regular, bold, italic, etc)
```

### `src/services/visualService.js`
**Responsabilidade:** Elementos visuais reutilizáveis
```javascript
desenharBorda(page)              // Borda decorativa dourada
desenharMarcaDagua(page, f)      // Marca d'água com estrela
desenharCabecalho(page, f)       // Cabeçalho prefeitura
desenharTitulo(page, f, yBase)   // Título "CERTIFICADO"
desenharRodape(page, f, ...)     // Rodapé com assinaturas
```

### `src/services/pdfService.js`
**Responsabilidade:** Gerar PDFs de certificados
```javascript
gerarIndividual(d)  // Certificado de 1 curso
gerarAnual(d)       // Certificado anual com frente/verso e tabela de cursos
```

### `src/services/signatureService.js`
**Responsabilidade:** Assinatura digital (placeholder)
```javascript
carregarCertificado(caminhoP12, senha)  // TODO: Implementar
assinarPDF(pdfBytes, certificado)       // TODO: Implementar
```

---

## ✅ Testes de Sintaxe

Todos os arquivos foram validados com `node -c`:

```
✓ api/gerar-certificado.js: OK
✓ src/services/pdfService.js: OK
✓ src/services/fontService.js: OK
✓ src/services/visualService.js: OK
✓ src/services/signatureService.js: OK
✓ src/utils/validator.js: OK
✓ src/utils/formatter.js: OK
✓ src/utils/text.js: OK
✓ src/utils/drawing.js: OK
✓ src/config/constants.js: OK
```

---

## 🎯 Próximos Passos

1. **Testes Unitários:** Adicionar testes para validadores e formatadores
2. **Assinatura Digital:** Implementar `signatureService.js` com p12sign ou similar
3. **Documentação:** Adicionar JSDoc nos módulos
4. **Error Handling:** Melhorar tratamento de erros específicos por serviço

---

## 📊 Resumo das Mudanças

| Métrica | Antes | Depois | Mudança |
|---------|-------|--------|---------|
| Linhas em `api/gerar-certificado.js` | 1108 | ~115 | -90% |
| Arquivos de módulo | 0 | 9 | +9 |
| Separação de responsabilidades | ❌ | ✅ | Melhorado |
| Reutilização de código | ❌ | ✅ | Possível |
| Testabilidade | ❌ | ✅ | Melhorada |

