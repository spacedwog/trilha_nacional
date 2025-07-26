// ESP32 - Código em Modo STA com Sensor Ultrassônico e GPS

#include <WiFi.h>
#include <WebServer.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>

// Defina suas credenciais Wi-Fi
const char* ssid = "FAMILIA SANTOS";
const char* password = "6z2h1j3k9f";

// Pinos do sensor ultrassônico
const int trigPin = 5;
const int echoPin = 18;

// GPS (UART2)
HardwareSerial gpsSerial(2);
TinyGPSPlus gps;

WebServer server(80);

float distanciaCM() {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duracao = pulseIn(echoPin, HIGH, 30000);
  return duracao * 0.034 / 2;
}

void handleRoot() {
  float distancia = distanciaCM();

  // Atualiza o GPS
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  float lat = gps.location.isValid() ? gps.location.lat() : 0.0;
  float lon = gps.location.isValid() ? gps.location.lng() : 0.0;

  String json = "{";
  json += "\"distancia_cm\":" + String(distancia, 2) + ",";
  json += "\"lat\":" + String(lat, 6) + ",";
  json += "\"lon\":" + String(lon, 6);
  json += "}";

  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17); // RX, TX

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  WiFi.begin(ssid, password);
  Serial.print("Conectando-se ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConectado!");
  Serial.println(WiFi.localIP());

  server.on("/dados", handleRoot);
  server.begin();
  Serial.println("Servidor HTTP iniciado");
}

void loop() {
  server.handleClient();
}
