import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { fetchAddresses } from '../lib/api';
import { CUISINE_PRESETS, DIET_OPTIONS } from '../lib/ui';
import { useAuth } from '../lib/authContext';
import AddressPicker from '../components/AddressPicker';

export default function SearchScreen({ navigation }) {
  const { signOut } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState('');

  const [cuisine, setCuisine] = useState('Chinese');
  const [budget, setBudget] = useState(300);
  const [diet, setDiet] = useState('all');

  const loadAddresses = useCallback(async () => {
    setAddrLoading(true);
    setAddrError('');
    const res = await fetchAddresses();
    setAddrLoading(false);
    if (res.status === 401) {
      signOut();
      return;
    }
    if (!res.ok) {
      setAddrError(res.error || 'Could not reach the backend.');
      setAddresses([]);
      return;
    }
    setAddresses(res.addresses);
    if (res.addresses.length) setAddressId(res.addresses[0].id);
  }, [signOut]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const canSearch = Boolean(addressId) && cuisine.trim().length > 0;

  return (
    <SafeAreaView className="flex-1 bg-[#0c0c11]" edges={['top']}>
      <ScrollView contentContainerClassName="px-5 py-5" keyboardShouldPersistTaps="handled">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-xl font-black tracking-tight text-white">What Should I Order?</Text>
            <Text className="mt-0.5 text-xs text-gray-500">Live on Swiggy · cuisine · budget</Text>
          </View>
          <Pressable onPress={signOut} className="rounded-full border border-white/10 px-3 py-1.5 active:opacity-70">
            <Text className="text-xs font-semibold text-gray-400">Log out</Text>
          </Pressable>
        </View>

        {/* Address */}
        <View className="mt-6">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Deliver to</Text>
          {addrLoading ? (
            <View className="flex-row items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <ActivityIndicator color="#f97316" size="small" />
              <Text className="text-xs text-gray-500">Loading your Swiggy addresses…</Text>
            </View>
          ) : addrError ? (
            <View className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
              <Text className="text-xs leading-relaxed text-amber-400">{addrError}</Text>
              <Pressable onPress={loadAddresses}><Text className="mt-2 text-xs font-bold text-amber-300">Retry</Text></Pressable>
            </View>
          ) : addresses.length ? (
            <AddressPicker addresses={addresses} value={addressId} onChange={setAddressId} />
          ) : (
            <Pressable onPress={loadAddresses}><Text className="text-xs text-gray-600">No addresses yet — tap to retry.</Text></Pressable>
          )}
        </View>

        {/* Craving */}
        <View className="mt-6">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Craving</Text>
          <TextInput
            value={cuisine}
            onChangeText={setCuisine}
            placeholder="Cuisine (e.g. Biryani)"
            placeholderTextColor="#4b5563"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white"
          />
          <View className="mt-2.5 flex-row flex-wrap gap-2">
            {CUISINE_PRESETS.map((c) => {
              const active = cuisine.toLowerCase() === c.toLowerCase();
              return (
                <Pressable key={c} onPress={() => setCuisine(c)} className={`rounded-full px-2.5 py-1.5 ${active ? 'bg-orange-500' : 'bg-white/5'}`}>
                  <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-400'}`}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Diet */}
        <View className="mt-6">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Diet</Text>
          <View className="flex-row gap-2">
            {DIET_OPTIONS.map(([val, label]) => {
              const active = diet === val;
              return (
                <Pressable key={val} onPress={() => setDiet(val)} className={`flex-1 rounded-xl py-2.5 ${active ? 'bg-orange-500' : 'bg-white/5'}`}>
                  <Text className={`text-center text-xs font-bold ${active ? 'text-white' : 'text-gray-400'}`}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Budget */}
        <View className="mt-6">
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-wider text-gray-500">Budget per dish</Text>
            <Text className="text-base font-bold text-green-400">₹{budget}</Text>
          </View>
          <Slider
            minimumValue={50}
            maximumValue={800}
            step={10}
            value={budget}
            onValueChange={setBudget}
            minimumTrackTintColor="#f97316"
            maximumTrackTintColor="#374151"
            thumbTintColor="#f97316"
          />
          <View className="flex-row justify-between">
            <Text className="text-xs text-gray-700">₹50</Text>
            <Text className="text-xs text-gray-700">₹800</Text>
          </View>
        </View>

        {/* CTA */}
        <Pressable
          disabled={!canSearch}
          onPress={() => navigation.navigate('Results', { addressId, cuisine: cuisine.trim(), budget, veg: diet })}
          className={`mt-8 rounded-xl py-4 ${canSearch ? 'bg-orange-500 active:opacity-90' : 'bg-white/5'}`}
        >
          <Text className={`text-center text-sm font-black tracking-wide ${canSearch ? 'text-white' : 'text-gray-600'}`}>
            Find Dishes →
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
