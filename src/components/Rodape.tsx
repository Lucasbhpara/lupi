import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Rodape({ claro = false }: { claro?: boolean }) {
  return <Text style={[styles.rodape, claro && { color: colors.textoClaro }]}>by Lucas Alberto</Text>;
}

const styles = StyleSheet.create({
  rodape: { textAlign: 'center', fontSize: 12, color: colors.textoSuave, paddingVertical: 10 },
});
