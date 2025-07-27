// server.js

var admin = require("firebase-admin");
var serviceAccount = require("./trilha-nacional-3ecee-firebase-adminsdk-fbsvc-4c0745c885.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://trilha-nacional-3ecee.firebaseio.com"
});

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// Pega uma referência ao seu banco de dados Firestore
const db = admin.firestore();

// --- NOVO ENDPOINT: Para o ESP32 enviar sua própria localização e distância ---
// Simula o ESP32 enviando seus dados para o servidor
// Em um cenário real, o seu ESP32 faria uma requisição POST para este endpoint.
app.post('/location', async (req, res) => {
  const { latitude, longitude, distancia_cm } = req.body;

  if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof distancia_cm !== 'number') {
    return res.status(400).send('Dados inválidos: latitude, longitude e distancia_cm são obrigatórios e devem ser números.');
  }

  console.log(`Recebido do ESP32 (simulado): Lat ${latitude}, Lon ${longitude}, Dist ${distancia_cm} cm`);

  try {
    // Salva a última localização e distância do ESP32 em um documento específico
    await db.collection('esp32_state').doc('current_location').set({
      latitude: latitude,
      longitude: longitude,
      distanciaUltrassonica: distancia_cm,
      timestamp: admin.firestore.FieldValue.serverTimestamp() // Timestamp do servidor
    });
    console.log('Dados do ESP32 salvos em esp32_state/current_location no Firestore.');
    res.status(200).send('Dados do ESP32 recebidos e salvos com sucesso!');
  } catch (error) {
    console.error('Erro ao salvar dados do ESP32 no Firestore:', error);
    res.status(500).send('Erro ao processar e salvar dados do ESP32.');
  }
});


// --- ENDPOINT EXISTENTE (renomeado): Para o Aplicativo React Native ---
// Agora, este endpoint irá buscar a última localização do ESP32 no Firestore.
app.post('/get_combined_location', async (req, res) => {
  const { latitude, longitude } = req.body; // Latitude e longitude do usuário do App.js

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return res.status(400).send('Dados inválidos: latitude e longitude do usuário são obrigatórias e devem ser números.');
  }

  console.log(`Recebido do App.js (Localização do Usuário): Lat ${latitude}, Lon ${longitude}`);

  let esp32Data = { latitude: 0, longitude: 0, distanciaUltrassonica: 0 }; // Default ou erro
  try {
    // 1. Busca a última localização e distância do ESP32 no Firestore
    const esp32Doc = await db.collection('esp32_state').doc('current_location').get();
    if (esp32Doc.exists) {
      esp32Data = esp32Doc.data();
      console.log('Últimos dados do ESP32 lidos do Firestore:', esp32Data);
    } else {
      console.warn('Nenhum dado do ESP32 encontrado no Firestore em esp32_state/current_location.');
      // Você pode definir um fallback ou retornar um erro se o dado do ESP32 for crítico
    }
  } catch (error) {
    console.error('Erro ao ler dados do ESP32 do Firestore:', error);
    // Continuar mesmo com erro na leitura do ESP32, mas com dados padrão ou vazios
  }

  try {
    // 2. Salva a localização combinada (usuário + ESP32) no Firestore
    const localizacaoRef = db.collection('localizacoes').doc('ultima'); // Sobrescreve o último registro
    await localizacaoRef.set({
      usuario: {
        latitude: latitude,
        longitude: longitude,
      },
      esp32: {
        latitude: esp32Data.latitude,
        longitude: esp32Data.longitude,
        distanciaUltrassonica: esp32Data.distanciaUltrassonica,
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(), // Timestamp do servidor
    });
    console.log('Localização combinada salva no Firestore (localizacoes/ultima).');

    // 3. Responde ao aplicativo React Native com os dados do ESP32
    // O aplicativo usará estes dados para exibir o marcador do ESP32 no mapa
    res.status(200).json({
      esp_latitude: esp32Data.latitude,
      esp_longitude: esp32Data.longitude,
      distancia_cm: esp32Data.distanciaUltrassonica
    });

  } catch (error) {
    console.error('Erro ao salvar localização combinada ou responder ao App.js:', error);
    res.status(500).send('Erro interno ao processar sua solicitação.');
  }
});

// --- Inicia o Servidor ---
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  console.log('Firebase Admin SDK inicializado.');
  console.log('Aguardando requisições em /location (do ESP32) e /get_combined_location (do App.js).');
});