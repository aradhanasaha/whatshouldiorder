import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { addToCart } from '../lib/api';

/**
 * Shown after a dish is added: confirms the cart (and the address it's bound to) and suggests
 * complementary dishes from the same restaurant so you can complete the order without leaving.
 */
export default function AddedSheet({ visible, result, addressId, restaurantId, restaurantName, veg, onClose }) {
  const [cart, setCart] = useState(result?.cart || null);
  const [items, setItems] = useState(result?.complements || []);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    setCart(result?.cart || null);
    setItems(result?.complements || []);
  }, [result]);

  const addMore = async (dish) => {
    setBusyId(dish.id);
    // Same restaurant as what's already in the cart, so this can't conflict.
    const res = await addToCart({
      addressId,
      restaurantId,
      restaurantName,
      itemId: dish.id,
      veg,
      force: true,
    });
    setBusyId(null);
    if (res.ok) {
      setCart(res.cart);
      setItems((cur) => cur.filter((d) => d.id !== dish.id));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/60" onPress={onClose}>
        <Pressable className="max-h-[80%] rounded-t-3xl bg-[#16161c] px-5 pb-8 pt-3" onPress={() => {}}>
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-white/20" />

          <Text className="text-base font-bold text-green-400">Added to your Swiggy cart ✓</Text>
          {cart?.deliveryTo ? (
            <Text className="mt-1 text-xs text-gray-500" numberOfLines={2}>{cart.deliveryTo}</Text>
          ) : null}
          {cart?.toPay != null ? (
            <Text className="mt-1 text-xs text-gray-400">
              {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} · to pay ₹{cart.toPay}
            </Text>
          ) : null}

          {items.length ? (
            <>
              <Text className="mb-1 mt-5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Goes well with{restaurantName ? ` · ${restaurantName}` : ''}
              </Text>
              <ScrollView className="max-h-72" showsVerticalScrollIndicator={false}>
                {items.map((d) => (
                  <View key={d.id} className="flex-row items-center gap-3 border-b border-white/5 py-3">
                    {d.imageUrl ? (
                      <Image source={{ uri: d.imageUrl }} className="h-11 w-11 rounded-lg" resizeMode="cover" />
                    ) : (
                      <View className="h-11 w-11 items-center justify-center rounded-lg bg-white/5">
                        <Text className="text-base">🍽️</Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-white" numberOfLines={1}>{d.name}</Text>
                      <Text className="mt-0.5 text-xs text-gray-500">
                        ₹{d.price}
                        {d.rating != null ? ` · ${d.rating}★` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => addMore(d)}
                      disabled={busyId === d.id}
                      className="rounded-full bg-orange-500 px-4 py-2 active:opacity-80"
                    >
                      {busyId === d.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text className="text-xs font-bold text-white">+ Add</Text>
                      )}
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable onPress={onClose} className="flex-1 rounded-xl bg-white/10 py-3 active:opacity-80">
              <Text className="text-center text-sm font-bold text-white">Keep browsing</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(result?.cartUrl || 'https://www.swiggy.com/cart')}
              className="flex-1 rounded-xl bg-orange-500 py-3 active:opacity-80"
            >
              <Text className="text-center text-sm font-bold text-white">Open cart ↗</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
