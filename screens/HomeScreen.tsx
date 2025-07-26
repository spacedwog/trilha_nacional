/* screens/HomeScreen.tsx */
import React from 'react';
import { View, Button, StyleSheet } from 'react-native';

import type { StackNavigationProp } from '@react-navigation/stack';

type HomeScreenProps = {
  navigation: StackNavigationProp<any>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Button title="📍 Mapa" onPress={() => navigation.navigate('Map')} />
      <Button title="📊 Gráficos" onPress={() => navigation.navigate('Graph')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-evenly',
    padding: 20
  }
});