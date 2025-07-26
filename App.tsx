import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import TcpSocket from 'react-native-tcp-socket';

export default function App() {
  const [location, setLocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tcpStatus, setTcpStatus] = useState<string>('Desconectado');
  const [receivedData, setReceivedData] = useState<string>('');
  const [client, setClient] = useState<any>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permissão para localização negada.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    })();
  }, []);

  const connectToServer = () => {
    const options = {
      port: 1234, // porta do servidor TCP
      host: '192.168.15.166', // IP do servidor (ex: ESP32 ou servidor local)
      reuseAddress: true,
    };

    const newClient = TcpSocket.createConnection(options, () => {
      setTcpStatus('Conectado');
      newClient.write('Cliente conectado.\n');
    });

    newClient.on('data', function (data: string | Buffer) {
      setReceivedData((prev) => prev + (typeof data === 'string' ? data : data.toString()));
    });

    newClient.on('error', function (error: any) {
      setTcpStatus('Erro: ' + error.message);
    });

    newClient.on('close', function () {
      setTcpStatus('Conexão fechada');
    });

    setClient(newClient);
  };

  const sendLocation = () => {
    if (client && location) {
      const { latitude, longitude } = location.coords;
      client.write(`Localização: ${latitude}, ${longitude}\n`);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>App TCP/IP + GPS</Text>
      <Text style={styles.label}>Status da Conexão: {tcpStatus}</Text>

      <Button title="Conectar ao Servidor TCP" onPress={connectToServer} />
      <Button title="Enviar Localização" onPress={sendLocation} />

      {location && (
        <Text style={styles.label}>
          Localização Atual: {location.coords.latitude}, {location.coords.longitude}
        </Text>
      )}
      {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

      <Text style={styles.label}>Dados Recebidos do Servidor:</Text>
      <Text style={styles.data}>{receivedData}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#121212',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00ff99',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginVertical: 8,
    color: '#ffffff',
  },
  error: {
    color: 'red',
  },
  data: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 10,
  },
});