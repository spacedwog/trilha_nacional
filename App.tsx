import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'SUA_API_KEY',
  authDomain: 'seu-app.firebaseapp.com',
  projectId: 'seu-app',
  storageBucket: 'seu-app.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdefghij',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ESP32_URL = 'http://192.168.15.166/location'; // 🧠 Modo STA do ESP32

export default function App() {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [esp32Location, setEsp32Location] = useState<{ latitude: number; longitude: number } | null>(null);
  const [ultrasonicDistance, setUltrasonicDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão negada para acessar localização');
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({});
        setUserLocation(currentLocation);
      } catch (err) {
        console.warn('Erro ao obter localização, usando fallback:', err);
        setUserLocation({
          coords: {
            latitude: -23.561684, longitude: -46.625378, accuracy: 0, altitude: 0, heading: 0, speed: 0,
            altitudeAccuracy: null
          },
          timestamp: Date.now(),
        });
      }
    })();
  }, []);

  const salvarLocalizacaoNoFirebase = async (
    userLat: number,
    userLng: number,
    espLat: number,
    espLng: number,
    distancia: number
  ) => {
    const localizacaoRef = doc(db, 'localizacoes', 'ultima');

    await setDoc(localizacaoRef, {
      usuario: {
        latitude: userLat,
        longitude: userLng,
      },
      esp32: {
        latitude: espLat,
        longitude: espLng,
        distanciaUltrassonica: distancia,
      },
      timestamp: new Date(),
    });
  };

  const enviarLocalizacao = async () => {
    if (!userLocation) return;

    try {
      const res = await fetch(ESP32_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        }),
      });

      const data = await res.json();

      if (data.esp_latitude && data.esp_longitude) {
        setEsp32Location({
          latitude: data.esp_latitude,
          longitude: data.esp_longitude,
        });
      }

      if (data.distancia_cm !== undefined) {
        setUltrasonicDistance(data.distancia_cm);
      }

      await salvarLocalizacaoNoFirebase(
        userLocation.coords.latitude,
        userLocation.coords.longitude,
        data.esp_latitude,
        data.esp_longitude,
        data.distancia_cm
      );
    } catch (err: any) {
      Alert.alert('Erro ao conectar com o ESP32', err.message);
    }
  };

  const renderMap = () => {
    if (!userLocation) return <Text style={styles.text}>{errorMsg || 'Obtendo localização...'}</Text>;

    const region = {
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    return (
      <MapView style={styles.map} region={region}>
        <Marker
          coordinate={{
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          }}
          title="Você"
          pinColor="blue"
        />

        {esp32Location && (
          <Marker
            coordinate={{
              latitude: esp32Location.latitude,
              longitude: esp32Location.longitude,
            }}
            title="ESP32"
            description={`Distância Ultrassônica: ${ultrasonicDistance} cm`}
            pinColor="green"
          />
        )}
      </MapView>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📍 Trilha Nacional</Text>
      {renderMap()}
      <Button title="📡 Enviar Localização" onPress={enviarLocalizacao} />
      {ultrasonicDistance !== null && (
        <Text style={styles.text}>🧭 Distância medida: {ultrasonicDistance} cm</Text>
      )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ffcc',
    textAlign: 'center',
    marginBottom: 10,
  },
  map: {
    width: Dimensions.get('window').width,
    height: 400,
  },
  text: {
    textAlign: 'center',
    margin: 10,
    color: '#fff',
  },
});