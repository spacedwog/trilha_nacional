/* screens/NotificationScreen.tsx */
import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import PushNotification from 'react-native-push-notification';

export default function NotificationScreen() {
  useEffect(() => {
    PushNotification.createChannel(
      {
        channelId: 'alertas',
        channelName: 'Alertas de Distância'
      },
      (created: boolean) => {
        // Channel created, or already exists
        console.log(`createChannel returned '${created}'`);
      }
    );
  }, []);

  const enviarNotificacao = () => {
    PushNotification.localNotification({
      channelId: 'alertas',
      title: 'Sensor Ativado',
      message: 'Objeto detectado próximo!'
    });
  };

  return (
    <View>
      <Text>Notificações</Text>
      <Button title="Enviar Notificação" onPress={enviarNotificacao} />
    </View>
  );
}