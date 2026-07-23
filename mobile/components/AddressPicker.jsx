import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

const FNF = 'Friends & Family';

// Swiggy returns "Person: full address" — split so we can show the person separately.
function splitAddress(address = '') {
  const i = address.indexOf(':');
  if (i === -1) return { person: '', detail: address.trim() };
  return { person: address.slice(0, i).trim(), detail: address.slice(i + 1).trim() };
}

const isFnf = (a) => (a.category || '') === FNF;

/** Primary/secondary text for a row: own addresses lead with their tag, F&F with the person. */
function labelFor(a) {
  const { person, detail } = splitAddress(a.address);
  return isFnf(a) ? { primary: person || a.label, secondary: detail } : { primary: a.label, secondary: detail };
}

function Row({ address, selected, onPress, indented }) {
  const { primary, secondary } = labelFor(address);
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-start gap-3 py-3 ${indented ? 'pl-4' : ''} border-b border-white/5 active:opacity-70`}
    >
      <Text className="text-base mt-0.5">{selected ? '📍' : '·'}</Text>
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${selected ? 'text-orange-400' : 'text-white'}`}>{primary}</Text>
        <Text className="mt-0.5 text-xs leading-4 text-gray-500" numberOfLines={2}>
          {secondary}
        </Text>
      </View>
    </Pressable>
  );
}

export default function AddressPicker({ addresses = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [fnfOpen, setFnfOpen] = useState(false);

  const own = addresses.filter((a) => !isFnf(a));
  const fnf = addresses.filter(isFnf);
  const selected = addresses.find((a) => a.id === value);
  const sel = selected ? labelFor(selected) : null;

  const pick = (id) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 active:opacity-80"
      >
        <View className="flex-1 pr-2">
          <Text className="text-sm font-semibold text-white" numberOfLines={1}>
            {sel ? sel.primary : 'Select an address'}
          </Text>
          {sel ? (
            <Text className="mt-0.5 text-xs text-gray-500" numberOfLines={1}>
              {sel.secondary}
            </Text>
          ) : null}
        </View>
        <Text className="text-xs text-gray-500">▾</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-black/60" onPress={() => setOpen(false)}>
          <Pressable className="max-h-[75%] rounded-t-3xl bg-[#16161c] px-5 pb-8 pt-3" onPress={() => {}}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-white/20" />
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-bold text-white">Deliver to</Text>
              <Pressable onPress={() => setOpen(false)} className="px-2 py-1">
                <Text className="text-sm text-gray-400">Close</Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {own.length ? (
                <Text className="mb-1 mt-2 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Your addresses
                </Text>
              ) : null}
              {own.map((a) => (
                <Row key={a.id} address={a} selected={a.id === value} onPress={() => pick(a.id)} />
              ))}

              {fnf.length ? (
                <>
                  <Pressable
                    onPress={() => setFnfOpen((v) => !v)}
                    className="mt-4 flex-row items-center justify-between rounded-xl bg-white/5 px-3 py-3 active:opacity-70"
                  >
                    <Text className="text-sm font-semibold text-white">👥 Friends &amp; Family</Text>
                    <Text className="text-xs text-gray-400">
                      {fnf.length} {fnfOpen ? '▴' : '▾'}
                    </Text>
                  </Pressable>
                  {fnfOpen
                    ? fnf.map((a) => (
                        <Row key={a.id} address={a} selected={a.id === value} onPress={() => pick(a.id)} indented />
                      ))
                    : null}
                </>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
