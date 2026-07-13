import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { getApiBase, setApiBase } from '../lib/api';
import { login } from '../lib/auth';

export default function LoginScreen({ onAuthed }) {
  const [base, setBase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getApiBase().then(setBase);
  }, []);

  const connect = async () => {
    setError('');
    const trimmed = base.trim();
    if (!trimmed) {
      setError('Enter your backend URL first.');
      return;
    }
    await setApiBase(trimmed);
    setBusy(true);
    const res = await login();
    setBusy(false);
    if (res.ok) onAuthed();
    else setError(res.error || 'Login failed');
  };

  return (
    <View className="flex-1 bg-[#0c0c11] px-6 justify-center">
      <Text className="text-white text-3xl font-black tracking-tight">What Should I Order?</Text>
      <Text className="text-gray-500 text-sm mt-2 mb-10">
        Find dishes near you that fit your cuisine and budget — ranked by your own Swiggy order history.
      </Text>

      <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Backend URL</Text>
      <TextInput
        value={base}
        onChangeText={setBase}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://your-backend.onrender.com"
        placeholderTextColor="#4b5563"
        className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm mb-6"
      />

      <Pressable
        onPress={connect}
        disabled={busy}
        className={`rounded-xl py-4 items-center ${busy ? 'bg-white/10' : 'bg-orange-500'}`}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-black text-sm tracking-wide">Connect your Swiggy account</Text>
        )}
      </Pressable>

      {error ? <Text className="text-red-400 text-xs mt-3">{error}</Text> : null}

      <Text className="text-gray-600 text-[11px] leading-relaxed mt-8">
        You'll sign in securely on Swiggy — we never see your Swiggy password. Ordering happens on Swiggy.
        Powered by Swiggy.
      </Text>
    </View>
  );
}
