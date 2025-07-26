// server.js

// 1. Primeiro, vamos importar o Firebase Admin SDK
var admin = require("firebase-admin");

// 2. Agora, vamos apontar para o seu arquivo de chave da conta de serviço.
// Lembre-se de substituir 'path/to/serviceAccountKey.json' pelo caminho real
// onde você salvou o arquivo JSON que baixou do console do Firebase.
var serviceAccount = require("./trilha-nacional-3ecee-firebase-adminsdk-fbsvc-4c0745c885.json");

// 3. E agora, a mágica: inicializamos o Firebase Admin SDK!
// Isso permite que seu servidor tenha acesso privilegiado aos serviços Firebase.
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
  // Se você for usar o Realtime Database, lembre-se de adicionar a databaseURL aqui,
  // por exemplo: databaseURL: "https://<SEU_DATABASE_NAME>.firebaseio.com"
});

// Agora, o restante do seu código Express.js
const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/location', (req, res) => {
  const { latitude, longitude } = req.body;
  console.log(`Recebido: Lat ${latitude}, Lon ${longitude}`);

  // *** AQUI VOCÊ PODE COMEÇAR A USAR O FIREBASE ADMIN SDK! ***
  // Por exemplo, para salvar a localização no Cloud Firestore:
  /*
  const db = admin.firestore();
  db.collection('locations').add({
    latitude: latitude,
    longitude: longitude,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  })
  .then(() => {
    console.log('Localização salva no Firestore!');
    res.send('Localização recebida e salva com sucesso!');
  })
  .catch((error) => {
    console.error('Erro ao salvar localização:', error);
    res.status(500).send('Erro ao processar sua solicitação.');
  });
  */
  // Ou para o Realtime Database:
  /*
  const dbRT = admin.database();
  dbRT.ref('locations').push({
    latitude: latitude,
    longitude: longitude,
    timestamp: Date.now()
  })
  .then(() => {
    console.log('Localização salva no Realtime Database!');
    res.send('Localização recebida e salva com sucesso!');
  })
  .catch((error) => {
    console.error('Erro ao salvar localização:', error);
    res.status(500).send('Erro ao processar sua solicitação.');
  });
  */

  // Por enquanto, sem a parte do Firebase descomentada, a resposta é simples:
  res.send('Localização recebida com sucesso!');
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log('Firebase Admin SDK inicializado e pronto para uso!');
});