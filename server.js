// server.js

// 1. Primeiro, vamos importar o Firebase Admin SDK
var admin = require("firebase-admin");

// 2. Agora, vamos apontar para o seu arquivo de chave da conta de serviço.
// Lembre-se de substituir './trilha-nacional-3ecee-firebase-adminsdk-fbsvc-4c0745c885.json'
// pelo caminho real onde você salvou o arquivo JSON que baixou do console do Firebase.
// Certifique-se de que o arquivo esteja na mesma pasta do seu server.js,
// ou ajuste o caminho conforme necessário.
var serviceAccount = require("./trilha-nacional-3ecee-firebase-adminsdk-fbsvc-4c0745c885.json");

// 3. E agora, a mágica: inicializamos o Firebase Admin SDK!
// Isso permite que seu servidor tenha acesso privilegiado aos serviços Firebase.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Se você for usar o Realtime Database, adicione a databaseURL aqui,
  // usando o ID do seu projeto. Para Cloud Firestore, não é necessário.
  // databaseURL: "https://trilha-nacional-3ecee.firebaseio.com"
});

// Agora, o restante do seu código Express.js
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json()); // Habilita o Express a ler JSON no corpo das requisições

// Rota para receber dados de localização
app.post('/location', (req, res) => {
  const { latitude, longitude } = req.body; // Pega latitude e longitude do corpo da requisição
  console.log(`Recebido: Lat ${latitude}, Lon ${longitude}`);

  // *** AQUI VOCÊ VAI USAR O FIREBASE ADMIN SDK! ***

  // Opção 1: Salvar a localização no Cloud Firestore (recomendado para a maioria dos casos)
  const db = admin.firestore();
  db.collection('locations').add({
    latitude: latitude,
    longitude: longitude,
    timestamp: admin.firestore.FieldValue.serverTimestamp() // Timestamp gerado pelo servidor
  })
  .then(() => {
    console.log('Localização salva no Firestore!');
    // Apenas envia a resposta DEPOIS que os dados forem salvos com sucesso
    res.send('Localização recebida e salva com sucesso no Firestore!');
  })
  .catch((error) => {
    console.error('Erro ao salvar localização no Firestore:', error);
    // Em caso de erro, envia um status 500
    res.status(500).send('Erro ao processar sua solicitação e salvar no Firestore.');
  });


  /*
  // Opção 2: Salvar a localização no Realtime Database (descomente para usar este)
  // Certifique-se de que databaseURL esteja configurado em admin.initializeApp() se usar o RTDB.
  // E comente a seção do Cloud Firestore acima se for usar esta.

  const dbRT = admin.database();
  dbRT.ref('locations').push({ // .push() cria uma chave única para cada entrada
    latitude: latitude,
    longitude: longitude,
    timestamp: admin.database.ServerValue.TIMESTAMP // Timestamp gerado pelo servidor (melhor que Date.now())
  })
  .then(() => {
    console.log('Localização salva no Realtime Database!');
    res.send('Localização recebida e salva com sucesso no Realtime Database!');
  })
  .catch((error) => {
    console.error('Erro ao salvar localização no Realtime Database:', error);
    res.status(500).send('Erro ao processar sua solicitação e salvar no Realtime Database.');
  });
  */

  // IMPORTANTE: Removi a linha 'res.send("Localização recebida com sucesso!");'
  // que estava fora do bloco .then/.catch, pois ela causaria um erro
  // (tentativa de enviar resposta múltiplas vezes).
  // A resposta agora é enviada apenas DENTRO do .then ou .catch da operação do banco de dados.

});

// Inicia o servidor Express
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log('Firebase Admin SDK inicializado e pronto para uso!');
});