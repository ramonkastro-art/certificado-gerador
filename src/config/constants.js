const { rgb } = require('pdf-lib');

// ══════════════════════════════════════════════════════════════
//  PALETA DE CORES
// ══════════════════════════════════════════════════════════════
const COR = {
  verde:   rgb(0.102, 0.361, 0.180),   // #1a5c2e
  verdeM:  rgb(0.180, 0.490, 0.275),   // #2e7d46
  dourado: rgb(0.788, 0.659, 0.298),   // #c9a84c
  preto:   rgb(0.173, 0.173, 0.173),   // #2c2c2c
  cinza:   rgb(0.400, 0.400, 0.400),   // #666666
  cinzaC:  rgb(0.820, 0.820, 0.820),   // #d1d1d1
  branco:  rgb(1.000, 1.000, 1.000),
  fundo:   rgb(0.997, 0.994, 0.988),   // off-white quente
  verdeBg: rgb(0.945, 0.976, 0.953),   // fundo linha total
};

// ══════════════════════════════════════════════════════════════
//  DIMENSÕES — A4 PAISAGEM (pontos)
// ══════════════════════════════════════════════════════════════
const W = 841.89;
const H = 595.28;

// ══════════════════════════════════════════════════════════════
//  PATHS DE FONTES
// ══════════════════════════════════════════════════════════════
const FONT_PATHS = {
  cormorantRegular:    'CormorantGaramond-Regular.ttf',
  cormorantBold:       'CormorantGaramond-Bold.ttf',
  cormorantItalic:     'CormorantGaramond-Italic.ttf',
  cormorantBoldItalic: 'CormorantGaramond-BoldItalic.ttf',
  openSansRegular:     'OpenSans-Regular.ttf',
  openSansBold:        'OpenSans-Bold.ttf',
};

module.exports = {
  COR,
  W,
  H,
  FONT_PATHS,
};
