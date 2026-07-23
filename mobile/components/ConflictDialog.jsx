import { Modal, Pressable, Text, View } from 'react-native';

/**
 * Swiggy silently wipes the cart when you add from a different restaurant, so we confirm first.
 */
export default function ConflictDialog({ visible, currentItems = [], onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable className="flex-1 items-center justify-center bg-black/70 px-8" onPress={onCancel}>
        <Pressable className="w-full rounded-2xl bg-[#16161c] p-5" onPress={() => {}}>
          <Text className="text-base font-bold text-white">Different restaurant</Text>
          <Text className="mt-2 text-sm leading-relaxed text-gray-400">
            You're selecting from a different place, it will reset your cart.
          </Text>

          {currentItems.length ? (
            <View className="mt-3 rounded-xl bg-white/5 px-3 py-2">
              <Text className="text-[11px] uppercase tracking-wider text-gray-500">Currently in cart</Text>
              {currentItems.slice(0, 4).map((n, i) => (
                <Text key={`${n}-${i}`} className="mt-1 text-xs text-gray-300" numberOfLines={1}>
                  · {n}
                </Text>
              ))}
            </View>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            <Pressable onPress={onCancel} className="flex-1 rounded-xl bg-white/10 py-3 active:opacity-80">
              <Text className="text-center text-sm font-bold text-white">Cancel</Text>
            </Pressable>
            <Pressable onPress={onConfirm} className="flex-1 rounded-xl bg-orange-500 py-3 active:opacity-80">
              <Text className="text-center text-sm font-bold text-white">Reset &amp; add</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
