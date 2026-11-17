import React from 'react';
import { View, StyleSheet } from 'react-native';
import { arcoIris } from '../theme/colors';

// Faixinha com as seis cores do arco-íris.
export default function FaixaArcoIris({ altura = 6, arredondada = false }: { altura?: number; arredondada?: boolean }) {
  return (
    <View style={[styles.faixa, { height: altura }, arredondada && { borderRadius: altura / 2, overflow: 'hidden' }]}>
      {arcoIris.map((c) => (
        <View key={c} style={{ flex: 1, backgroundColor: c }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  faixa: { flexDirection: 'row', width: '100%' },
});
