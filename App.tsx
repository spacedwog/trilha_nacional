// App.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Dimensions } from 'react-native';
import * as Notifications from 'expo-notifications';
import { LineChart } from 'react-native-chart-kit';

const largura = Dimensions.get('window').width;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function App() {
  const [distancia, setDistancia] = useState<number | null>(null);
  const [historico, setHistorico] = useState<number[]>([]);
  const [localizacao, setLocalizacao] = useState<{ lat: number, lon: number } | null>(null);

  async function enviarNotificacao(distancia: number) {
    if (distancia < 30) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 Objeto detectado!",
          body: `Distância: ${distancia} cm`,
        },
        trigger: null,
      });
    }
  }

  async function buscarDadosDoESP32() {
    try {
      const response = await fetch('http://192.168.15.166/dados');
      const data = await response.json();
      setDistancia(data.distancia_cm);
      setLocalizacao({ lat: data.lat, lon: data.lon });
      setHistorico((prev) => [...prev.slice(-9), data.distancia_cm]);
      await enviarNotificacao(data.distancia_cm);
    } catch (err) {
      console.error('Erro ao buscar dados do ESP32:', err);
    }
  }

  useEffect(() => {
    const intervalo = setInterval(buscarDadosDoESP32, 5000); // Atualiza a cada 5 segundos
    return () => clearInterval(intervalo);
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Dashboard ESP32</Text>

      <Text style={styles.texto}>Distância atual: {distancia ?? '--'} cm</Text>

      {localizacao && (
        <Text style={styles.texto}>GPS: {localizacao.lat.toFixed(5)}, {localizacao.lon.toFixed(5)}</Text>
      )}

      <LineChart
        data={{
          labels: historico.map((_, i) => `${i + 1}s`),
          datasets: [{ data: historico.length > 0 ? historico : [0] }],
        }}
        width={largura - 40}
        height={220}
        yAxisSuffix="cm"
        chartConfig={{
          backgroundColor: '#e26a00',
          backgroundGradientFrom: '#fb8c00',
          backgroundGradientTo: '#ffa726',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          style: { borderRadius: 16 },
        }}
        style={{ marginVertical: 10, borderRadius: 16 }}
      />

      <Button title="Atualizar Agora" onPress={buscarDadosDoESP32} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  texto: {
    fontSize: 16,
    color: '#ddd',
    marginBottom: 5,
  },
});