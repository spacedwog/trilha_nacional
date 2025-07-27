import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

// Sua configuração do Firebase
const firebaseConfig = {
  apiKey: 'AIzaSyABWthQjkzaRQL7HFQv_LayVdvWK4dZNX8',
  authDomain: 'trilha-nacional-3ecee.firebaseapp.com',
  projectId: 'trilha-nacional-3ecee',
  storageBucket: 'trilha-nacional-3ecee.firebasestorage.app',
  messagingSenderId: '6939870526',
  appId: '1:6939870526:ios:de749390dae6ef5c59586f',
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// >>> MUDANÇA AQUI: NOVO ENDPOINT QUE BUSCA A LOCALIZAÇÃO DO ESP32 DO FIRESTORE <<<
// Certifique-se de que este IP é o IP da máquina onde o seu server.js está rodando!
const SERVER_URL = 'http://192.168.15.166:3000'; // IP do seu server.js + porta
const GET_COMBINED_LOCATION_ENDPOINT = `${SERVER_URL}/location`; // Endpoint que o server.js expõe para obter a localização combinada

export default function App() {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [esp32Location, setEsp32Location] = useState<{ latitude: number; longitude: number } | null>(null);
  const [ultrasonicDistance, setUltrasonicDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão negada para acessar localização. O mapa pode não funcionar corretamente.');
        Alert.alert('Permissão de Localização Necessária', 'Por favor, conceda permissão para que o aplicativo possa acessar sua localização.');
        return;
      }

      try {
        let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        setUserLocation(currentLocation);
      } catch (err) {
        console.warn('Erro ao obter localização real, usando fallback:', err);
        setErrorMsg('Erro ao obter localização. Usando localização de demonstração.');
        setUserLocation({
          coords: {
            latitude: -23.561684, // Ex: Masp, São Paulo
            longitude: -46.625378,
            accuracy: 5,
            altitude: 700,
            heading: 0,
            speed: 0,
            altitudeAccuracy: 5
          },
          timestamp: Date.now(),
        });
      }
    })();
  }, []);

  // Esta função só salva dados no Firebase se o server.js não o fizer,
  // mas com a nova arquitetura, o server.js já salva a localização combinada.
  // MANTENHO PARA CLAREZA, MAS PODE SER REMOVIDA SE O SERVER.JS FOR A FONTE ÚNICA DE VERDADE.
  const salvarLocalizacaoNoFirebase = async (
    userLat: number,
    userLng: number,
    espLat: number,
    espLng: number,
    distancia: number
  ) => {
    const localizacaoRef = doc(db, 'localizacoes', 'ultima_do_app'); // Mudei para evitar conflito com 'ultima' do server
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
        timestamp: Timestamp.now(),
      });
      Alert.alert('Sucesso!', 'Dados de localização (via App) enviados ao Firebase!'); // Pode comentar se o server.js gerencia isso
    } catch (error) {
      console.error('Erro ao salvar no Firestore (App):', error);
      Alert.alert(
        'Erro ao salvar no Firebase',
        `Não foi possível enviar os dados do App. Erro: ${(error as any).message}.`
      );
    }
  };

  const enviarLocalizacao = async () => {
    if (!userLocation) {
      Alert.alert('Localização não disponível', 'Aguarde a obtenção da sua localização.');
      return;
    }

    try {
      // 1. Envia a localização do usuário para o seu servidor (que buscará a do ESP32)
      const res = await fetch(GET_COMBINED_LOCATION_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}. Resposta do servidor: ${errorBody}`);
      }

      // 2. Espera uma resposta JSON do servidor com os dados do ESP32 (que o servidor buscou do Firebase)
      const data = await res.json();

      if (
        typeof data.esp_latitude === 'number' &&
        typeof data.esp_longitude === 'number' &&
        typeof data.distancia_cm === 'number'
      ) {
        // Atualiza o estado do aplicativo com a localização do ESP32 e distância
        setEsp32Location({
          latitude: data.esp_latitude,
          longitude: data.esp_longitude,
        });
        setUltrasonicDistance(data.distancia_cm);

        // Opcional: Se quiser que o app também salve no Firebase (além do server.js)
        // await salvarLocalizacaoNoFirebase(
        //   userLocation.coords.latitude,
        //   userLocation.coords.longitude,
        //   data.esp_latitude,
        //   data.esp_longitude,
        //   data.distancia_cm
        // );

        Alert.alert('Sucesso!', 'Dados de localização do usuário e do dispositivo enviados/recebidos.');

      } else {
        Alert.alert('Dados inválidos recebidos do servidor', 'Verifique a estrutura da resposta do seu servidor.');
        console.warn('Dados recebidos do servidor com formato inesperado:', data);
      }
    } catch (err: any) {
      console.error('Erro ao comunicar com o servidor:', err);
      Alert.alert(
        'Erro de Comunicação',
        `Não foi possível conectar ou receber dados do servidor em ${GET_COMBINED_LOCATION_ENDPOINT}. Erro: ${err.message}. Certifique-se de que o servidor está rodando e acessível na rede.`
      );
    }
  };

  const renderMap = () => {
    if (errorMsg) {
      return <Text style={styles.text}>{errorMsg}</Text>;
    }
    if (!userLocation) {
      return <Text style={styles.text}>Obtendo localização do usuário...</Text>;
    }

    const region = {
      latitude: userLocation.coords.latitude,
      longitude: userLocation.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    return (
      <MapView style={styles.map} initialRegion={region}>
        <Marker
          coordinate={{
            latitude: userLocation.coords.latitude,
            longitude: userLocation.coords.longitude,
          }}
          title="Sua Localização"
          description="Você está aqui!"
          pinColor="blue"
        />

        {esp32Location && (
          <Marker
            coordinate={{
              latitude: esp32Location.latitude,
              longitude: esp32Location.longitude,
            }}
            title="Localização do Dispositivo"
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
      <View style={styles.mapContainer}>
        {renderMap()}
      </View>
      <View style={styles.buttonContainer}>
        <Button title="📡 Enviar e Obter Localização" onPress={enviarLocalizacao} color="#000000" />
      </View>
      {ultrasonicDistance !== null && (
        <Text style={styles.text}>
          🧭 Distância medida pelo dispositivo: <Text style={styles.distanceValue}>{ultrasonicDistance} cm</Text>
        </Text>
      )}
      {userLocation && (
        <Text style={styles.text}>
          Sua Lat: {userLocation.coords.latitude.toFixed(4)}, Lon: {userLocation.coords.longitude.toFixed(4)}
        </Text>
      )}
       {esp32Location && (
        <Text style={styles.text}>
          Dispositivo Lat: {esp32Location.latitude.toFixed(4)}, Lon: {esp32Location.longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 30 : 50,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#00ffcc',
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  mapContainer: {
    width: '100%',
    height: Dimensions.get('window').height * 0.55,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 20,
    borderColor: '#00ffcc',
    borderWidth: 2,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  buttonContainer: {
    width: '80%',
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#00ffcc',
  },
  text: {
    textAlign: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
    color: '#e0e0e0',
    fontSize: 16,
  },
  distanceValue: {
    fontWeight: 'bold',
    color: '#ffa500',
  }
});