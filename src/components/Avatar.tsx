import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Perfil } from '../data/api';
import { colors } from '../theme/colors';

// Bolinha do perfil: o símbolo escolhido (bola, carrinho...) sobre a cor da criança.
export default function Avatar({ perfil, tamanho = 96 }: { perfil: Pick<Perfil, 'nome' | 'cor' | 'avatar'>; tamanho?: number }) {
  return (
    <View
      style={[
        styles.bola,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2, backgroundColor: perfil.cor || colors.azul, borderWidth: tamanho > 50 ? 4 : 2 },
      ]}
    >
      <Text style={{ fontSize: tamanho * 0.5, color: colors.branco, fontWeight: '800' }}>
        {perfil.avatar || perfil.nome.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bola: { alignItems: 'center', justifyContent: 'center', borderColor: colors.branco },
});
