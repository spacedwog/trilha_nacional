/* screens/MapScreen.tsx */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import axios from 'axios';

export default function MapScreen() {
  const [location, setLocation] = useState({ lat: 0, lon: 0 });

  useEffect(() => {
    const fetchData = async () => {
      const res = await axios.get('http://<IP_DO_ESP32>/dados');
      setLocation({ lat: res.data.lat, lon: res.data.lon });
    };
    fetchData();
  }, []);

  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: location.lat,
        longitude: location.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker
        coordinate={{ latitude: location.lat, longitude: location.lon }}
        title="ESP32"
        description="Localização do sensor"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1
  }
});