const fontkit = require('@pdf-lib/fontkit');
const { StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { FONT_PATHS } = require('../config/constants');

// ══════════════════════════════════════════════════════════════
//  SERVIÇO DE FONTES — OTIMIZADO COM CACHE EM MEMÓRIA
// ══════════════════════════════════════════════════════════════

/**
 * PRÉ-CARREGA todos os bytes de fontes UMA ÚNICA VEZ
 * quando o módulo é inicializado (não em cada requisição).
 * Isso reduz I/O de disco drasticamente.
 */
const FONT_BYTES_CACHE = (() => {
  const dir = process.cwd();
  
  const lerFonte = (nome) => {
    try {
      return fs.readFileSync(path.join(dir, nome));
    } catch {
      return null;
    }
  };

  return {
    cormorantRegular:    lerFonte(FONT_PATHS.cormorantRegular),
    cormorantBold:       lerFonte(FONT_PATHS.cormorantBold),
    cormorantItalic:     lerFonte(FONT_PATHS.cormorantItalic),
    cormorantBoldItalic: lerFonte(FONT_PATHS.cormorantBoldItalic),
    openSansRegular:     lerFonte(FONT_PATHS.openSansRegular),
    openSansBold:        lerFonte(FONT_PATHS.openSansBold),
  };
})();

/**
 * Carrega fontes do cache de memória e embutem no PDF
 * Reutiliza bytes já lidos do disco (evita I/O repetido)
 * 
 * @param {PDFDocument} pdfDoc - Documento PDF para embutir fontes
 * @returns {Promise<Object>} Objeto com fontes prontas para usar
 */
async function carregarFontes(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);

  const embutir = async (bytes, fallback) =>
    bytes ? pdfDoc.embedFont(bytes) : pdfDoc.embedFont(fallback);

  return {
    regular:    await embutir(FONT_BYTES_CACHE.cormorantRegular,    StandardFonts.TimesRoman),
    bold:       await embutir(FONT_BYTES_CACHE.cormorantBold,       StandardFonts.TimesRomanBold),
    italic:     await embutir(FONT_BYTES_CACHE.cormorantItalic,     StandardFonts.TimesRomanItalic),
    boldItalic: await embutir(FONT_BYTES_CACHE.cormorantBoldItalic, StandardFonts.TimesRomanBoldItalic),
    sans:       await embutir(FONT_BYTES_CACHE.openSansRegular,     StandardFonts.Helvetica),
    sansBold:   await embutir(FONT_BYTES_CACHE.openSansBold,        StandardFonts.HelveticaBold),
  };
}

module.exports = {
  carregarFontes,
};
