import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Image, ScrollView, Keyboard } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';
import FaixaArcoIris from '../components/FaixaArcoIris';

const lupi = require('../../assets/lupi.png');

// Usuário curto: quem digitar só "familia" entra como "familia@lupi.app".
// Quem digitar um e-mail completo entra com o e-mail mesmo.
export const DOMINIO_CURTO = '@lupi.app';
export function emailDoUsuario(usuario: string) {
  const u = usuario.trim().toLowerCase();
  if (u.includes('@')) return u;
  // "Lucas Alberto" vira "lucasalberto@lupi.app" (sem espaços e sem acentos)
  const semAcento = typeof u.normalize === 'function' ? u.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : u;
  const curto = semAcento.replace(/[^a-z0-9._-]/g, '');
  return `${curto}${DOMINIO_CURTO}`;
}

export default function LoginScreen() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setErro(null);
    if (!usuario.trim() || !senha) {
      setErro('Preencha o usuário e a senha.');
      return;
    }
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: emailDoUsuario(usuario), password: senha });
    setEntrando(false);
    if (error) setErro('Usuário ou senha não conferem.');
  }

  // Com o teclado aberto, o Lupi encolhe para a caixa de texto não ficar escondida.
  const [tecladoAberto, setTecladoAberto] = useState(false);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', () => setTecladoAberto(true));
    const b = Keyboard.addListener('keyboardDidHide', () => setTecladoAberto(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  return (
    <KeyboardAvoidingView style={styles.fundo} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.rolagem} keyboardShouldPersistTaps="handled">
      <View style={[styles.topo, tecladoAberto && styles.topoCompacto]}>
        <Image source={lupi} style={tecladoAberto ? styles.lupiPequeno : styles.lupi} resizeMode="contain" accessibilityLabel="Lupi, o lobinho de fone arco-íris" />
        <Text style={styles.logo}>LUPI</Text>
        {!tecladoAberto && <Text style={styles.slogan}>Você lê, a história ganha vida.</Text>}
      </View>
      <View style={styles.cartao}>
        <FaixaArcoIris altura={6} />
        <View style={styles.cartaoMiolo}>
          <Text style={styles.titulo}>Entrar</Text>
          <Text style={styles.rotulo}>Usuário</Text>
          <TextInput
            style={styles.campo}
            value={usuario}
            onChangeText={setUsuario}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Seu nome"
            returnKeyType="next"
            placeholderTextColor={colors.textoClaro}
          />
          <Text style={styles.rotulo}>Senha</Text>
          <TextInput
            style={styles.campo}
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
            placeholder="••••••"
            placeholderTextColor={colors.textoClaro}
            onSubmitEditing={entrar}
          />
          {erro && <Text style={styles.erro}>{erro}</Text>}
          <TouchableOpacity style={styles.botao} onPress={entrar} disabled={entrando}>
            {entrando ? <ActivityIndicator color={colors.branco} /> : <Text style={styles.botaoTexto}>Entrar</Text>}
          </TouchableOpacity>
        </View>
      </View>
      {!tecladoAberto && <Rodape claro comMensagem />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.navy },
  rolagem: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  topo: { alignItems: 'center', marginBottom: spacing.xxl },
  topoCompacto: { marginBottom: spacing.md },
  lupi: { width: 150, height: 150, marginBottom: spacing.xs },
  lupiPequeno: { width: 64, height: 64 },
  logo: { color: colors.branco, fontSize: 48, fontWeight: '900', letterSpacing: 4 },
  slogan: { color: colors.textoClaro, fontSize: 15, marginTop: spacing.xs },
  cartao: { backgroundColor: colors.branco, borderRadius: radius.xl, overflow: 'hidden' },
  cartaoMiolo: { padding: spacing.xl },
  titulo: { fontSize: 20, fontWeight: '800', color: colors.texto },
  rotulo: { fontSize: 13, fontWeight: '700', color: colors.textoSuave, marginTop: spacing.md, marginBottom: spacing.xs },
  campo: {
    borderWidth: 1,
    borderColor: colors.borda,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 18,
    color: colors.texto,
    backgroundColor: colors.fundo,
  },
  erro: { color: colors.vermelho, marginTop: spacing.md, fontSize: 14, fontWeight: '600' },
  botao: { backgroundColor: colors.verde, borderRadius: radius.md, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  botaoTexto: { color: colors.branco, fontWeight: '800', fontSize: 18 },
});
