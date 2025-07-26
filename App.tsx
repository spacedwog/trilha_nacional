import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';

export default function App() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [serverResponse, setServerResponse] = useState<string>('');

  const ESP32_URL = 'http://192.168.15.166/location'; // ← IP do ESP32 em modo Access Point

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão negada para acessar localização');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    })();
  }, []);

  const sendLocationToESP32 = async () => {
    if (!location) return;

    try {
      const res = await fetch(ESP32_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      });

      const text = await res.text();
      setServerResponse(text);
    } catch (err: any) {
      Alert.alert('Erro ao conectar com ESP32', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📍 GPS + Mapa + ESP32</Text>

      {location ? (
        <MapView
          style={styles.map}
          region={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
        >
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Você está aqui"
            pinColor="blue"
          />
        </MapView>
      ) : (
        <Text style={styles.text}>{errorMsg || 'Obtendo localização...'}</Text>
      )}

      <Button title="📡 Enviar Localização para o ESP32" onPress={sendLocationToESP32} />

      {serverResponse ? (
        <Text style={styles.response}>ESP32: {serverResponse}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#111',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00ffcc',
    textAlign: 'center',
    marginBottom: 10,
  },
  map: {
    width: Dimensions.get('window').width,
    height: 300,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 10,
  },
  response: {
    marginTop: 15,
    color: '#0f0',
    fontSize: 16,
    textAlign: 'center',
  },
});