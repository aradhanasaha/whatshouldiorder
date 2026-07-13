import './global.css';
import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SearchScreen from './screens/SearchScreen';
import ResultsScreen from './screens/ResultsScreen';
import LoginScreen from './screens/LoginScreen';
import { AuthContext } from './lib/authContext';
import { getToken, logout } from './lib/auth';

const Stack = createNativeStackNavigator();

export default function App() {
  const [authed, setAuthed] = useState(undefined); // undefined = loading

  useEffect(() => {
    getToken().then((t) => setAuthed(Boolean(t)));
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setAuthed(false);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthContext.Provider value={{ signOut }}>
        {authed === undefined ? (
          <View className="flex-1 items-center justify-center bg-[#0c0c11]">
            <ActivityIndicator color="#f97316" />
          </View>
        ) : authed ? (
          <NavigationContainer>
            <Stack.Navigator>
              <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
              <Stack.Screen
                name="Results"
                component={ResultsScreen}
                options={{ title: 'Dishes', headerStyle: { backgroundColor: '#0c0c11' }, headerTintColor: '#fff' }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        ) : (
          <LoginScreen onAuthed={() => setAuthed(true)} />
        )}
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}
