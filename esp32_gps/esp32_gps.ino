#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

#define TRIG 5
#define ECHO 18

const char* ssid = "FAMILIA SANTOS";       // 🔁 Troque aqui
const char* password = "6z2h1j3k9f";      // 🔁 Troque aqui

WebServer server(80);

float latitudeESP = -23.561234;
float longitudeESP = -46.654321;

long medirDistancia() {
  digitalWrite(TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG, LOW);

  long duracao = pulseIn(ECHO, HIGH);
  long distancia_cm = duracao * 0.034 / 2;
  return distancia_cm;
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);

  WiFi.begin(ssid, password);
  Serial.print("Conectando à rede Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConectado!");
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP());

  server.on("/location", HTTP_POST, []() {
    if (!server.hasArg("plain")) {
      server.send(400, "application/json", "{\"error\": \"Sem corpo JSON\"}");
      return;
    }

    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, server.arg("plain"));
    if (error) {
      server.send(400, "application/json", "{\"error\": \"JSON inválido\"}");
      return;
    }

    float lat_cliente = doc["latitude"];
    float lon_cliente = doc["longitude"];
    Serial.printf("Cliente em: %.6f, %.6f\n", lat_cliente, lon_cliente);

    long distancia = medirDistancia();
    Serial.printf("Distância medida: %ld cm\n", distancia);

    StaticJsonDocument<200> response;
    response["esp_latitude"] = latitudeESP;
    response["esp_longitude"] = longitudeESP;
    response["distancia_cm"] = distancia;

    String res;
    serializeJson(response, res);
    server.send(200, "application/json", res);
  });

  server.begin();
}

void loop() {
  server.handleClient();
}
