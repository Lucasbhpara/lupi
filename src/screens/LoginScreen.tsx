import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';

// Entrada com a conta da família (criada uma vez no painel do Supabase).
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar() {
    setErro(null);
    if (!email.trim() || !senha) {
      setErro('Preencha o e-mail e a senha.');
      return;
    }
    setEntrando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEntrando(false);
    if (error) setErro('E-mail ou senha não conferem.');
  }

  return (
    <KeyboardAvoidingView style={styles.fundo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <View style={styles.topo}>
        <Text style={styles.logo}>LUPI</Text>
        <Text style={styles.slogan}>Você lê, a história ganha vida.</Text>
      </View>
      <View style={styles.cartao}>
        <Text style={styles.titulo}>Entrar com a conta da família</Text>
        <Text style={styles.rotulo}>E-mail</Text>
        <TextInput
          style={styles.campo}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="email@exemplo.com"
          placeholderTextColor={colors.textoClaro}
        />
        <Text style={styles.rotulo}>Senha</Text>
        <TextInput
          style={styles.campo}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
          autoComplete="password"
          placeholder="••••••••"
          placeholderTextColor={colors.textoClaro}
          onSubmitEditing={entrar}
        />
        {erro && <Text style={styles.erro}>{erro}</Text>}
        <TouchableOpacity style={styles.botao} onPress={entrar} disabled={entrando}>
          {entrando ? <ActivityIndicator color={colors.branco} /> : <Text style={styles.botaoTexto}>Entrar</Text>}
        </TouchableOpacity>
      </View>
      <Rodape claro />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.navy, justifyContent: 'center', padding: spacing.xl },
  topo: { alignItems: 'center', marginBottom: spacing.xxxl },
  logo: { color: colors.branco, fontSize: 48, fontWeight: '900', letterSpacing: 4 },
  slogan: { color: colors.textoClaro, fontSize: 15, marginTop: spacing.xs },
  cartao: { backgroundColor: colors.branco, borderRadius: radius.xl, padding: spacing.xl },
  titulo: { fontSize: 18, fontWeight: '800', color: colors.texto, marginBottom: spacing.md },
  rotulo: { fontSize: 13, fontWeight: '600', color: colors.textoSuave, marginTop: spacing.md, marginBottom: spacing.xs },
  campo: {
    borderWidth: 1,
    borderColor: colors.borda,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.texto,
    backgroundColor: colors.fundo,
  },
  erro: { color: colors.vermelho, marginTop: spacing.md, fontSize: 14 },
  botao: { backgroundColor: colors.verde, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
  botaoTexto: { color: colors.branco, fontWeight: '800', fontSize: 17 },
});
