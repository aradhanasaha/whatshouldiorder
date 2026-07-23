// Platform-safe token storage. expo-secure-store has no web implementation, so on web we fall
// back to localStorage (fine for local dev/demo; native keeps the encrypted secure store).
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export async function getItem(key) {
  if (isWeb) return globalThis.localStorage?.getItem(key) || null;
  return (await SecureStore.getItemAsync(key)) || null;
}

export async function setItem(key, value) {
  if (isWeb) {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key) {
  if (isWeb) {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
