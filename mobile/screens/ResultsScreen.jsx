import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { discover } from '../lib/api';
import { sortDishes } from '../lib/ui';
import DishCard from '../components/DishCard';

const SORTS = [
  { key: 'match', label: 'Best match' },
  { key: 'rating', label: 'Rating' },
  { key: 'distance', label: 'Distance' },
  { key: 'price', label: 'Price' },
];

export default function ResultsScreen({ route }) {
  const { addressId, cuisine, budget, veg } = route.params;
  const [loading, setLoading] = useState(true);
  const [dishes, setDishes] = useState([]);
  const [orderAgain, setOrderAgain] = useState([]);
  const [mode, setMode] = useState('');
  const [error, setError] = useState('');
  const [sort, setSort] = useState('match');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError('');
      const res = await discover({ addressId, cuisine, budget, veg });
      if (!alive) return;
      setLoading(false);
      setMode(res.mode || '');
      if (!res.ok) setError(res.error || 'Search failed.');
      else {
        setDishes(res.dishes);
        setOrderAgain(res.orderAgain);
      }
    })();
    return () => { alive = false; };
  }, [addressId, cuisine, budget, veg]);

  const isLive = mode === 'shared-local';
  const sorted = sortDishes(dishes, sort);

  const Header = (
    <View className="pb-1">
      <View className="flex-row items-center gap-2">
        <Text className="text-lg font-bold text-gray-900">{dishes.length} dishes</Text>
        {!!cuisine && <Text className="text-sm text-gray-400">for “{cuisine}”</Text>}
        {!!mode && (
          <View className={`rounded-full px-2 py-0.5 ${isLive ? 'bg-green-50' : 'bg-amber-50'}`}>
            <Text className={`text-[11px] font-bold ${isLive ? 'text-green-600' : 'text-amber-600'}`}>
              {isLive ? '● Live Swiggy' : '● Sample data'}
            </Text>
          </View>
        )}
      </View>
      <Text className="mt-1 text-sm text-gray-500">Ranked by rating, distance, and your order history.</Text>

      {orderAgain.length ? (
        <View className="mt-3">
          <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-orange-600">Order again</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {orderAgain.map((d, i) => (
              <Pressable
                key={`${d.name}-${i}`}
                onPress={() => d.swiggyUrl && Linking.openURL(d.swiggyUrl)}
                className="mr-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-xs font-semibold text-gray-800">{d.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3 flex-row">
        {SORTS.map((s) => {
          const active = sort === s.key;
          return (
            <Pressable key={s.key} onPress={() => setSort(s.key)} className={`mr-2 rounded-full px-3 py-1 ${active ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-500'}`}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={sorted}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => <DishCard dish={item} />}
        ListHeaderComponent={Header}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-24">
            {loading ? (
              <>
                <ActivityIndicator color="#f97316" />
                <Text className="mt-3 text-sm text-gray-400">Finding dishes on Swiggy…</Text>
              </>
            ) : (
              <>
                <Text className="text-4xl">🫙</Text>
                <Text className="mt-2 font-bold text-gray-700">{error || 'No dishes matched'}</Text>
                <Text className="mt-1 px-8 text-center text-sm text-gray-400">
                  Try a different cuisine, raise your budget, or switch the veg filter.
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}
