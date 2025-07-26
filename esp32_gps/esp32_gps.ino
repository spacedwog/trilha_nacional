#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

WebServer server(80);

void setup() {
  Serial.begin(115200);

  WiFi.softAP("ESP32_GPS", "12345678");
  Serial.println("Access Point iniciado");
  Serial.println(WiFi.softAPIP());

  server.on("/location", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      String body = server.arg("plain");
      StaticJsonDocument<200> doc;
      DeserializationError error = deserializeJson(doc, body);

      if (!error) {
        float lat = doc["latitude"];
        float lon = doc["longitude"];
        Serial.printf("Localização recebida: %.6f, %.6f\n", lat, lon);
        server.send(200, "text/plain", "Localização recebida com sucesso");
      } else {
        server.send(400, "text/plain", "Erro no JSON");
      }
    } else {
      server.send(400, "text/plain", "Requisição sem corpo");
    }
  });

  server.begin();
}

void loop() {
  server.handleClient();
}