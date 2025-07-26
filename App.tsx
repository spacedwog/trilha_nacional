import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, Alert } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverResponse, setServerResponse] = useState<string>('');

  const [serverUrl] = useState('http://192.168.0.100:3000/location'); // Altere para o IP do seu servidor local ou ESP32

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para acessar a localização foi negada');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const sendLocation = async () => {
    if (!location) {
      Alert.alert("Localização não disponível ainda.");
      return;
    }

    try {
      const res = await fetch(serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      });

      const data = await res.text();
      setServerResponse(data);
    } catch (err) {
      if (err instanceof Error) {
        setServerResponse('Erro ao conectar com o servidor: ' + err.message);
      } else {
        setServerResponse('Erro ao conectar com o servidor: ' + String(err));
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>📡 GPS + HTTP (via Expo)</Text>

      {location ? (
        <Text style={styles.text}>
          Latitude: {location.coords.latitude.toFixed(6)}{"\n"}
          Longitude: {location.coords.longitude.toFixed(6)}
        </Text>
      ) : (
        <Text style={styles.text}>{errorMsg || 'Obtendo localização...'}</Text>
      )}

      <Button title="Enviar Localização para o Servidor" onPress={sendLocation} />

      {serverResponse && (
        <>
          <Text style={styles.subtitle}>Resposta do servidor:</Text>
          <Text style={styles.text}>{serverResponse}</Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#101010',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#00ffcc',
  },
  subtitle: {
    marginTop: 20,
    fontSize: 18,
    color: '#00ffaa',
  },
  text: {
    fontSize: 16,
    color: '#ffffff',
    marginVertical: 10,
  },
});