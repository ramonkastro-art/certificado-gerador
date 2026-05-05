const QRCode = require('qrcode');

/**
 * Gera um QR Code como Data URL (PNG)
 * @param {string} text - Texto/URL para codificar no QR Code
 * @returns {Promise<string>} Data URL do QR Code
 */
async function gerarQRCode(text) {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0D1F3C',  // Azul navy
        light: '#FAF8F3', // Cream
      },
    });
    return dataUrl;
  } catch (err) {
    console.error('[QR Code]', err);
    throw err;
  }
}

module.exports = {
  gerarQRCode,
};
