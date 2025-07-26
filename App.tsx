import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Button, Alert, Dimensions, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore'; // Importei Timestamp também para clareza

// Sua configuração do Firebase (obtida do seu projeto Firebase)
const firebaseConfig = {
  apiKey: 'AIzaSyABWthQjkzaRQL7HFQv_LayVdvWK4dZNX8', // Use sua chave API real aqui!
  authDomain: 'trilha-nacional-3ecee.firebaseapp.com',
  projectId: 'trilha-nacional-3ecee',
  storageBucket: 'trilha-nacional-3ecee.firebasestorage.app',
  messagingSenderId: '6939870526',
  appId: '1:6939870526:ios:de749390dae6ef5c59586f', // ID específico para seu app iOS
};

// Inicializa o Firebase e o Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// URL do seu servidor (onde o server.js está rodando e simulando o ESP32)
// Certifique-se de que este IP está acessível do seu dispositivo/emulador!
const ESP32_URL = 'http://192.168.15.166/location';

export default function App() {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [esp32Location, setEsp32Location] = useState<{ latitude: number; longitude: number } | null>(null);
  const [ultrasonicDistance, setUltrasonicDistance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Efeito para solicitar permissão de localização e obter a localização inicial do usuário
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
        // Fallback para uma localização fixa se a obtenção falhar (ex: emulador sem localização real)
        setUserLocation({
          coords: {
            latitude: -23.561684, // Ex: Masp, São Paulo
            longitude: -46.625378,
            accuracy: 5, // Simulado
            altitude: 700, // Simulado
            heading: 0,
            speed: 0,
            altitudeAccuracy: 5
          },
          timestamp: Date.now(),
        });
      }
    })();
  }, []);

  // Função para salvar dados combinados (usuário e ESP32) no Firestore
  const salvarLocalizacaoNoFirebase = async (
    userLat: number,
    userLng: number,
    espLat: number,
    espLng: number,
    distancia: number
  ) => {
    // Usamos 'ultima' como ID do documento para sempre sobrescrever com os dados mais recentes.
    // Se você quisesse um histórico, usaria `addDoc(collection(db, 'localizacoes_historico'), { ... })`
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
        timestamp: Timestamp.now(), // Usa o Timestamp do Firestore para consistência
      });
      Alert.alert('Sucesso!', 'Dados de localização enviados ao Firebase!');
    } catch (error) {
      console.error('Erro ao salvar no Firestore:', error);
      Alert.alert(
        'Erro ao salvar no Firebase',
        `Não foi possível enviar os dados: ${
          typeof error === 'object' && error !== null && 'message' in error ? (error as { message: string }).message : String(error)
        }. Verifique sua conexão com a internet, as regras de segurança do Firebase e se o Firebase está configurado corretamente.`
      );
    }
  };

  // Envia a localização atual do usuário para o servidor (ESP32_URL) e recebe a do ESP32
  const enviarLocalizacao = async () => {
    if (!userLocation) {
      Alert.alert('Localização não disponível', 'Aguarde a obtenção da sua localização.');
      return;
    }

    try {
      // 1. Envia a localização do usuário para o seu servidor
      const res = await fetch(ESP32_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: userLocation.coords.latitude,
          longitude: userLocation.coords.longitude,
        }),
      });

      // Verifica se a resposta foi bem-sucedida (status 2xx)
      if (!res.ok) {
        const errorBody = await res.text(); // Tenta ler o corpo da resposta para mais detalhes
        throw new Error(`Erro HTTP: ${res.status} - ${res.statusText}. Resposta do servidor: ${errorBody}`);
      }

      // 2. Espera uma resposta JSON do servidor com os dados do ESP32
      const data = await res.json();

      // Valida os dados recebidos do servidor
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

        // 3. Salva a localização do usuário E do ESP32 no Firebase
        await salvarLocalizacaoNoFirebase(
          userLocation.coords.latitude,
          userLocation.coords.longitude,
          data.esp_latitude,
          data.esp_longitude,
          data.distancia_cm
        );
      } else {
        Alert.alert('Dados inválidos recebidos do servidor', 'Verifique a estrutura da resposta do seu servidor.');
        console.warn('Dados recebidos do servidor com formato inesperado:', data);
      }
    } catch (err: any) {
      console.error('Erro ao comunicar com o servidor (ESP32_URL):', err);
      Alert.alert(
        'Erro de Comunicação',
        `Não foi possível conectar ou receber dados do servidor em ${ESP32_URL}. Erro: ${err.message}. Certifique-se de que o servidor está rodando e acessível na rede.`
      );
    }
  };

  // Renderiza o componente MapView com os marcadores
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
      latitudeDelta: 0.01, // Zoom do mapa
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
        <Button title="📡 Enviar e Obter Localização" onPress={enviarLocalizacao} color="#00ffcc" />
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
    paddingTop: Platform.OS === 'android' ? 30 : 50, // Ajuste para Android
    backgroundColor: '#1a1a2e', // Um tom escuro para o fundo
    alignItems: 'center', // Centraliza o conteúdo horizontalmente
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#00ffcc', // Verde neon
    textAlign: 'center',
    marginBottom: 15,
    marginTop: 10,
  },
  mapContainer: {
    width: '100%',
    height: Dimensions.get('window').height * 0.55, // 55% da altura da tela para o mapa
    borderRadius: 10,
    overflow: 'hidden', // Garante que o raio da borda funcione
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
    overflow: 'hidden', // Para que a cor do botão preencha o borderRadius
    backgroundColor: '#00ffcc', // Cor de fundo do botão para estilização
  },
  text: {
    textAlign: 'center',
    marginHorizontal: 10,
    marginVertical: 5,
    color: '#e0e0e0', // Cor clara para o texto
    fontSize: 16,
  },
  distanceValue: {
    fontWeight: 'bold',
    color: '#ffa500', // Laranja para destacar a distância
  }
});