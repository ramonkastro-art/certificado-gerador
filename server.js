const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const gerarCertificado = require('./api/gerar-certificado');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Adapta o handler da API (que lê req como stream) para o Express
app.post('/gerar-certificado', async (req, res) => {
  // Reconstrói o body como string URL-encoded para o handler reutilizar URLSearchParams
  const qs = require('querystring');
  const bodyStr = qs.stringify(req.body);

  // Cria um objeto fake que imita stream + method, compatível com o handler da API
  const fakeReq = {
    method: 'POST',
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(bodyStr);
    },
  };

  await gerarCertificado(fakeReq, res);
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});