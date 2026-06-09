import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../api/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const initSocket = async () => {
      const userStr = await AsyncStorage.getItem('userData');
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const newSocket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true',
          'bypass-tunnel-reminder': 'true',
        }
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('join', user.id);
      });

      newSocket.on('notification', (data) => {
        console.log('New notification:', data);
        alert(`${data.title}\n${data.message}`);
      });

      setSocket(newSocket);
    };

    initSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  return socket;
};
