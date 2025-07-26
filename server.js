// server.js
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/location', (req, res) => {
  const { latitude, longitude } = req.body;
  console.log(`Recebido: Lat ${latitude}, Lon ${longitude}`);
  res.send('Localização recebida com sucesso!');
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});