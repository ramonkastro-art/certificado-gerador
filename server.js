const express = require('express');
const bodyParser = require('body-parser');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const signpdf = require('@signpdf/signpdf').default;
const { pdflibAddPlaceholder } = require('@signpdf/placeholder-pdf-lib');
const { P12Signer } = require('@signpdf/signer-p12');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/gerar-certificado', async (req, res) => {
  const { aluno, curso, palestrante, horas, data_inicio, data_fim, local } = req.body;

  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Imagem de fundo
    const backgroundPath = path.join(__dirname, 'assets', 'background.png');
    const backgroundBytes = await fs.readFile(backgroundPath);
    const backgroundImage = await pdfDoc.embedPng(backgroundBytes);
    page.drawImage(backgroundImage, {
      x: 0,
      y: 0,
      width: width,
      height: height,
      opacity: 0.8,
    });

    // Formatação de datas
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const formattedDataInicio = formatDate(data_inicio);
    const formattedDataFim = formatDate(data_fim);
    const dataTexto = formattedDataFim 
      ? `de ${formattedDataInicio} a ${formattedDataFim}` 
      : `na data de ${formattedDataInicio}`;

    // Função para centralizar texto
    const centerText = (text, y, size, color) => {
      const textWidth = helveticaFont.widthOfTextAtSize(text, size);
      const x = (width - textWidth) / 2;
      page.drawText(text, { x, y, size, font: helveticaFont, color });
    };

    // Título centralizado
    centerText('CERTIFICADO DE CONCLUSÃO', height - 170, 32, rgb(0, 0.2, 0.6));

    const fontSize = 21;
    const lineHeight = 27; // Espaçamento vertical aumentado

    // Textos centralizados
    centerText(`Certificamos que`, height - 220, fontSize, rgb(0, 0, 0));
    centerText(`${aluno.toUpperCase()}`, height - 220 - lineHeight, fontSize + 2, rgb(0, 0, 0));
    centerText(`concluiu com aproveitamento o curso`, height - 220 - lineHeight * 2, fontSize, rgb(0, 0, 0));
    centerText(`"${curso}"`, height - 220 - lineHeight * 3, fontSize + 2, rgb(0.1, 0.1, 0.1));
    centerText(`com carga horária de ${horas} horas, ministrado por`, height - 220 - lineHeight * 4, fontSize, rgb(0, 0, 0));
    centerText(`${palestrante}`, height - 220 - lineHeight * 5, fontSize, rgb(0, 0, 0));
    centerText(`Realizado em ${local}, ${dataTexto}.`, height - 220 - lineHeight * 7, fontSize, rgb(0, 0, 0));

    // Linha e assinatura centralizadas
    centerText('_________________________________________', height - 480, 14, rgb(0, 0, 0));
    centerText('Secretária de Educação', height - 500, 14, rgb(0, 0, 0));

    // Placeholder para assinatura
    pdflibAddPlaceholder({
      pdfDoc,
      reason: 'Emissão de Certificado Oficial',
      contactInfo: 'secretaria@educacao.rs.gov.br',
      name: 'Secretaria de Educação - Teste',
      location: 'Vacaria, RS',
      signatureLength: 16384,
    });

    const pdfWithPlaceholder = await pdfDoc.save();

    const p12Buffer = await fs.readFile(path.join(__dirname, 'certificate.p12'));

    const signer = new P12Signer(p12Buffer, { passphrase: '123456' });

    const signedPdfBuffer = await signpdf.sign(pdfWithPlaceholder, signer);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="certificado-assinado-${aluno.replace(/\s+/g, '-')}.pdf"`,
      'Content-Length': signedPdfBuffer.length,
    });

    res.send(signedPdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar/assinar PDF:', error);
    res.status(500).send('Erro ao gerar o certificado. Veja o console para detalhes.');
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});