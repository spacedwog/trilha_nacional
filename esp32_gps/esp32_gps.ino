#include <WiFi.h>        // Biblioteca para conectar o ESP32 ao Wi-Fi
#include <WebServer.h>   // Biblioteca para criar um servidor web no ESP32
#include <ArduinoJson.h>// Biblioteca para manipular JSON (usada para ler e criar mensagens JSON)

// Definições dos pinos do sensor ultrassônico (HC-SR04 ou similar)
#define TRIG 5  // Pino TRIG do sensor (Trigger)
#define ECHO 18 // Pino ECHO do sensor (Echo)

// >>> IMPORTANTE: Suas credenciais de rede Wi-Fi <<<
// Troque "FAMILIA SANTOS" pelo nome da sua rede Wi-Fi (SSID)
const char* ssid = "FAMILIA SANTOS";
// Troque "6z2h1j3k9f" pela senha da sua rede Wi-Fi
const char* password = "6z2h1j3k9f";

// Cria uma instância do servidor web que escutará na porta 3000 (porta HTTP padrão)
WebServer server(3000);

// Localização fixa do ESP32
// Estas coordenadas representam a localização onde o seu ESP32 "está".
// Em um projeto real com GPS, estas seriam lidas de um módulo GPS.
float latitudeESP = -23.561234;
float longitudeESP = -46.654321;

/**
 * @brief Mede a distância usando o sensor ultrassônico.
 * @return A distância medida em centímetros.
 */
long medirDistancia() {
  // Garante que o pino TRIG esteja LOW antes de enviar o pulso
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2); // Pequeno atraso

  // Envia um pulso de 10 microssegundos no pino TRIG para iniciar a medição
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  // Lê a duração do pulso no pino ECHO (tempo que o som levou para ir e voltar)
  long duracao = pulseIn(ECHO, HIGH);

  // Calcula a distância em centímetros
  // Velocidade do som no ar é aproximadamente 0.034 cm/microsegundo
  // Distância = (duração * velocidade do som) / 2 (porque o som vai e volta)
  long distancia_cm = duracao * 0.034 / 2;
  return distancia_cm;
}

/**
 * @brief Função de configuração do ESP32 (roda uma vez na inicialização).
 */
void setup() {
  Serial.begin(115200); // Inicia a comunicação serial para debug

  // Configura os pinos do sensor ultrassônico
  pinMode(TRIG, OUTPUT); // TRIG como saída
  pinMode(ECHO, INPUT);  // ECHO como entrada

  // Conecta o ESP32 à rede Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Conectando à rede Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print("."); // Imprime pontos enquanto tenta conectar
  }

  Serial.println("\nConectado!"); // Mensagem de sucesso
  Serial.print("Endereço IP do ESP32: ");
  Serial.println(WiFi.localIP()); // Exibe o endereço IP do ESP32 na rede

  // --- Configuração da Rota do Servidor Web ---
  // Este é o endpoint /location que o seu server.js Node.js irá chamar.
  server.on("/location", HTTP_POST, []() {
    // Verifica se o corpo da requisição está no formato "plain" (JSON)
    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"error\": \"Sem corpo JSON ou formato incorreto\"}");
      return;
    }

    // Cria um documento JSON para deserializar (parsear) a requisição
    StaticJsonDocument<200> doc; // Tamanho do buffer JSON (ajuste se seus dados forem maiores)
    // Tenta parsear o corpo da requisição (server.arg("plain"))
    DeserializationError error = deserializeJson(doc, server.arg("plain"));
    if (error) { // Se houver erro no parsing do JSON
      Serial.printf("Erro no JSON: %s\n", error.c_str());
      server.send(400, "application/json", "{\"error\": \"JSON inválido\"}");
      return;
    }

    // Extrai a latitude e longitude do cliente (enviada pelo server.js)
    float lat_cliente = doc["latitude"];
    float lon_cliente = doc["longitude"];
    Serial.printf("Requisição recebida de cliente em: %.6f, %.6f\n", lat_cliente, lon_cliente);

    // Mede a distância usando o sensor ultrassônico
    long distancia = medirDistancia();
    Serial.printf("Distância medida: %ld cm\n", distancia);

    // Cria um documento JSON para a resposta
    StaticJsonDocument<200> response;
    response["esp_latitude"] = latitudeESP;      // Latitude fixa do ESP32
    response["esp_longitude"] = longitudeESP;   // Longitude fixa do ESP32
    response["distancia_cm"] = distancia;       // Distância medida

    // Serializa o documento JSON para uma String para enviar como resposta HTTP
    String res;
    serializeJson(response, res);

    // Envia a resposta HTTP com status 200 (OK), tipo de conteúdo JSON e o corpo JSON
    server.send(200, "application/json", res);
  });

  server.begin(); // Inicia o servidor web
}

/**
 * @brief Função principal do ESP32 (roda repetidamente após a configuração).
 */
void loop() {
  server.handleClient(); // Permite que o servidor web processe requisições de clientes
}
