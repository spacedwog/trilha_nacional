// screens/MapScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const [espLocation, setEspLocation] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada para acessar a localização');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      });
    })();

    const fetchESP = async () => {
      try {
        const res = await axios.get('192.168.15.166:3000/location');
        setEspLocation({
          latitude: res.data.lat,
          longitude: res.data.lon,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      } catch (error) {
        console.warn('Erro ao buscar localização do ESP32:', error);
      }
    };

    fetchESP();
  }, []);

  const region = userLocation || {
    latitude: -23.55052, // fallback (ex: São Paulo)
    longitude: -46.633308,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={region} region={region}>
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Você está aqui"
            pinColor="blue"
          />
        )}
        {espLocation && (
          <Marker
            coordinate={espLocation}
            title="ESP32"
            description="Localização do sensor"
            pinColor="red"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  map: {
    flex: 1
  }
});