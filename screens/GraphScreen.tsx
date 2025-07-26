/* screens/GraphScreen.tsx */
import React, { useEffect, useState } from 'react';
import { View, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import axios from 'axios';

export default function GraphScreen() {
  const [dados, setDados] = useState<number[]>([]);

  useEffect(() => {
    const intervalo = setInterval(async () => {
      const res = await axios.get('http://192.168.15.166/dados');
      setDados((old) => [...old.slice(-9), res.data.distancia_cm]);
    }, 3000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <View>
      <LineChart
        data={{
          labels: [...Array(dados.length).keys()].map(String),
          datasets: [{ data: dados }],
        }}
        width={Dimensions.get('window').width}
        height={220}
        yAxisSuffix="cm"
        chartConfig={{
          backgroundColor: '#e26a00',
          backgroundGradientFrom: '#fb8c00',
          backgroundGradientTo: '#ffa726',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
        }}
        bezier
      />
    </View>
  );
}