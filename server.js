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
// Dentro da sua rota app.post('/location', ...) no server.js
app.post('/location', (req, res) => {
  const { latitude, longitude } = req.body; // Latitude e longitude do usuário recebidas do App.js
  console.log(`Recebido do App.js: Lat ${latitude}, Lon ${longitude}`);

  // Salva a localização do usuário no Firestore (opcional, App.js já salva a combinada)
  // Você pode querer uma coleção separada para localizações de usuários, por exemplo.
  // const db = admin.firestore();
  // db.collection('user_locations').add({
  //   latitude: latitude,
  //   longitude: longitude,
  //   timestamp: admin.firestore.FieldValue.serverTimestamp()
  // }).then(() => console.log('Localização do usuário salva por server.js'));

  // *** IMPORTANTE: Simula a resposta do "ESP32" ***
  // Aqui você retornaria dados reais do ESP32 se ele enviasse para este servidor.
  // Por enquanto, vamos simular:
  const mockEsp32Lat = -23.562913; // Ex: Uma localização próxima ao Masp, para simular o ESP32
  const mockEsp32Lon = -46.626880;
  const mockDistance = Math.floor(Math.random() * 200) + 50; // Distância aleatória entre 50 e 250 cm

  // Envia a resposta JSON que o App.js espera
  res.json({
    esp_latitude: mockEsp32Lat,
    esp_longitude: mockEsp32Lon,
    distancia_cm: mockDistance
  });

  // Se você também quiser salvar o mock no Realtime DB, faça aqui:
  // const dbRT = admin.database();
  // dbRT.ref('esp32_data').push({
  //   latitude: mockEsp32Lat,
  //   longitude: mockEsp32Lon,
  //   distancia_cm: mockDistance,
  //   timestamp: admin.database.ServerValue.TIMESTAMP
  // });

});

// Inicia o servidor Express
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log('Firebase Admin SDK inicializado e pronto para uso!');
});