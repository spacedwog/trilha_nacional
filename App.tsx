import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyABWthQjkzaRQL7HFQv_LayVdvWK4dZNX8', // Use sua chave API real aqui!
  authDomain: 'trilha-nacional-3ecee.firebaseapp.com', // ✅ Corrigido para o seu domínio do projeto Firebase Hosting
  projectId: 'trilha-nacional-3ecee',
  storageBucket: 'trilha-nacional-3ecee.firebasestorage.app',
  messagingSenderId: '6939870526',
  appId: '1:6939870526:ios:de749390dae6ef5c59586f',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ESP32_URL = 'http://192.168.15.166/location'; // ✅ Endereço do ESP32

export default function App() {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [esp32Location, setEsp32Location] = useState<{ latitude: number; longitude: number } | null>(null);
  const [ultrasonicDistance, setUltrasonicDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Obter localização do usuário ao iniciar
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
        // Fallback para uma localização fixa se a obtenção falhar
        setUserLocation({
          coords: {
            latitude: -23.561684,
            longitude: -46.625378,
            accuracy: 0,
            altitude: 0,
            heading: 0,
            speed: 0,
            altitudeAccuracy: null
          },
          timestamp: Date.now(),
        });
      }
    })();
  }, []);

  // Função para salvar dados no Firestore
  const salvarLocalizacaoNoFirebase = async (
    userLat: number,
    userLng: number,
    espLat: number,
    espLng: number,
    distancia: number
  ) => {
    const localizacaoRef = doc(db, 'localizacoes', 'ultima');
    try {
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
      // ✅ Alerta de sucesso: Se chegamos aqui, os dados foram enviados com sucesso!
      Alert.alert('Sucesso!', 'Dados de localização enviados ao Firebase!');
    } catch (error) {
      console.warn('Erro ao salvar no Firestore:', error);
      // ✅ Alerta de erro: Este é o alerta para quando o save REALMENTE falha.
      Alert.alert('Erro ao salvar no Firebase', 'Não foi possível enviar os dados. Verifique sua conexão com a internet ou as permissões do Firebase.');
    }
  };

  // Envia a localização atual do usuário para o ESP32 e recebe a do ESP32
  const enviarLocalizacao = async () => {
    if (!userLocation) {
        Alert.alert('Localização do usuário não disponível', 'Aguarde a obtenção da sua localização.');
        return;
    }

    try {
      const res = await fetch(ESP32_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}`);
      }

      const data = await res.json();

      if (
        typeof data.esp_latitude === 'number' &&
        typeof data.esp_longitude === 'number' &&
        typeof data.distancia_cm === 'number'
      ) {
        setEsp32Location({
          latitude: data.esp_latitude,
          longitude: data.esp_longitude,
        });
        setUltrasonicDistance(data.distancia_cm);

        await salvarLocalizacaoNoFirebase(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          data.esp_latitude,
          data.esp_longitude,
          data.distancia_cm
        );
      } else {
        Alert.alert('Dados inválidos recebidos do ESP32', 'Verifique a resposta do seu dispositivo.');
      }

    } catch (err: any) {
      console.error('Erro ao conectar com o ESP32:', err);
      Alert.alert('Erro ao conectar com o ESP32', err.message || 'Erro desconhecido ao tentar comunicação.');
    }
  };

  // Renderiza o componente MapView com os marcadores
  const renderMap = () => {
    if (!userLocation)
      return <Text style={styles.text}>{errorMsg || 'Obtendo localização...'}</Text>;

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