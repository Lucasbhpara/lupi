import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

const infinito = require('../../assets/infinito.png');

export default function Rodape({ claro = false, comMensagem = false }: { claro?: boolean; comMensagem?: boolean }) {
  return (
    <View style={styles.caixa}>
      {comMensagem && (
        <>
          <Image source={infinito} style={styles.infinito} resizeMode="contain" accessibilityLabel="Infinito arco-íris, símbolo da neurodiversidade" />
          <Text style={[styles.mensagem, claro && { color: colors.branco }]}>
            Feito por um pai de crianças atípicas,{'\n'}para todas as crianças.
          </Text>
        </>
      )}
      <Text style={[styles.rodape, claro && { color: colors.textoClaro }]}>by Lucas Alberto</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { alignItems: 'center', paddingVertical: 10, gap: 6 },
  infinito: { width: 72, height: 36 },
  mensagem: { textAlign: 'center', fontSize: 13, lineHeight: 18, color: colors.textoSuave, fontWeight: '600' },
  rodape: { textAlign: 'center', fontSize: 12, color: colors.textoSuave },
});
