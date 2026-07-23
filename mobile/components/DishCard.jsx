import { useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { scoreBadge } from '../lib/ui';
import { addToCart } from '../lib/api';

function VegDot({ isVeg }) {
  if (isVeg == null) return null;
  const border = isVeg ? 'border-green-600' : 'border-red-600';
  const dot = isVeg ? 'bg-green-600' : 'bg-red-600';
  return (
    <View className={`h-3.5 w-3.5 items-center justify-center rounded-sm border ${border}`}>
      <View className={`h-1.5 w-1.5 rounded-full ${dot}`} />
    </View>
  );
}

export default function DishCard({ dish, addressId, veg, onAdded, onConflict }) {
  const badge = scoreBadge(dish.score);
  const [state, setState] = useState('idle'); // idle | adding | added | error
  const [error, setError] = useState('');

  const meta = [
    dish.restaurantName,
    dish.rating != null ? `${dish.rating}★` : null,
    dish.distanceKm != null ? `${dish.distanceKm} km` : null,
  ].filter(Boolean).join('  ·  ');

  const add = async (force = false) => {
    setState('adding');
    setError('');
    const res = await addToCart({
      addressId,
      restaurantId: dish.restaurantId,
      restaurantName: dish.restaurantName,
      itemId: dish.id,
      veg,
      force,
    });

    if (res.conflict) {
      setState('idle');
      // Parent shows the confirm dialog and calls back here with force=true.
      onConflict?.({ currentItems: res.currentItems, retry: () => add(true) });
      return;
    }
    if (res.ok) {
      setState('added');
      onAdded?.({ ...res, restaurantId: dish.restaurantId, restaurantName: dish.restaurantName });
      return;
    }
    setState('error');
    // Dishes with variants/addons can't be added blind — fall back to the menu page.
    setError(dish.hasVariants || dish.hasAddons ? 'Needs options — opening menu' : res.error || 'Could not add');
    if (dish.swiggyUrl) Linking.openURL(dish.swiggyUrl);
  };

  return (
    <View className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
      {dish.imageUrl ? (
        <Image source={{ uri: dish.imageUrl }} className="h-36 w-full" resizeMode="cover" />
      ) : null}

      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="mr-2 flex-1 flex-row items-center gap-2">
            <VegDot isVeg={dish.isVeg} />
            <Text className="flex-1 text-sm font-bold text-gray-900" numberOfLines={2}>
              {dish.name}
            </Text>
          </View>
          {dish.price != null ? <Text className="text-sm font-black text-orange-500">₹{dish.price}</Text> : null}
        </View>

        <Text className="mt-1 text-xs text-gray-400" numberOfLines={1}>{meta}</Text>

        <View className="mt-2 flex-row items-center gap-2">
          <View className={`rounded-full px-2 py-0.5 ${badge.bg}`}>
            <Text className={`text-xs font-bold ${badge.text}`}>{badge.emoji} {dish.score}</Text>
          </View>
          {dish.reason ? <Text className="text-[11px] text-gray-500">{dish.reason}</Text> : null}
        </View>

        <Pressable
          onPress={() => (state === 'added' ? Linking.openURL('https://www.swiggy.com/cart') : add(false))}
          disabled={state === 'adding'}
          className={`mt-3 rounded-xl py-2.5 active:opacity-80 ${state === 'added' ? 'bg-green-600' : 'bg-orange-500'}`}
        >
          {state === 'adding' ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text className="text-center text-xs font-bold text-white">
              {state === 'added' ? 'Added ✓ — open cart ↗' : 'Add to cart'}
            </Text>
          )}
        </Pressable>
        {error ? <Text className="mt-1 text-center text-[11px] text-amber-600">{error}</Text> : null}
      </View>
    </View>
  );
}
