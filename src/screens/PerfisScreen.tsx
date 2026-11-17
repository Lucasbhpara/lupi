import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Perfil, listarPerfis, criarPerfil } from '../data/api';
import { supabase } from '../lib/supabase';
import { colors, coresPerfil, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';

export default function PerfisScreen({ onEscolher }: { onEscolher: (p: Perfil) => void }) {
  const [perfis, setPerfis] = useState<Perfil[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(coresPerfil[0]);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const lista = await listarPerfis();
      setPerfis(lista);
      if (lista.length === 0) setCriando(true);
    } catch (e: any) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      const p = await criarPerfil(nome, cor);
      setPerfis((atual) => [...(atual ?? []), p]);
      setNome('');
      setCriando(false);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.fundo}>
      <StatusBar style="light" />
      <View style={styles.topo}>
        <Text style={styles.logo}>LUPI</Text>
        <Text style={styles.pergunta}>Quem vai ouvir hoje?</Text>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        {!perfis && !erro && <ActivityIndicator color={colors.branco} size="large" />}
        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.grade}>
          {(perfis ?? []).map((p) => (
            <TouchableOpacity key={p.id} style={styles.perfil} onPress={() => onEscolher(p)}>
              <View style={[styles.avatar, { backgroundColor: p.cor || colors.azul }]}>
                <Text style={styles.inicial}>{p.nome.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={styles.nome} numberOfLines={1}>
                {p.nome}
              </Text>
            </TouchableOpacity>
          ))}
          {perfis && !criando && (
            <TouchableOpacity style={styles.perfil} onPress={() => setCriando(true)}>
              <View style={[styles.avatar, styles.avatarNovo]}>
                <Text style={[styles.inicial, { color: colors.textoClaro }]}>+</Text>
              </View>
              <Text style={[styles.nome, { color: colors.textoClaro }]}>Novo perfil</Text>
            </TouchableOpacity>
          )}
        </View>

        {criando && (
          <View style={styles.cartao}>
            <Text style={styles.cartaoTitulo}>Novo perfil</Text>
            <TextInput
              style={styles.campo}
              value={nome}
              onChangeText={setNome}
              placeholder="Nome"
              placeholderTextColor={colors.textoSuave}
              maxLength={20}
            />
            <Text style={styles.rotulo}>Cor</Text>
            <View style={styles.cores}>
              {coresPerfil.map((c) => (
                <TouchableOpacity
                  key={c}
                  accessibilityLabel={`Cor ${c}`}
                  onPress={() => setCor(c)}
                  style={[styles.cor, { backgroundColor: c }, cor === c && styles.corEscolhida]}
                />
              ))}
            </View>
            <View style={styles.botoes}>
              {(perfis?.length ?? 0) > 0 && (
                <TouchableOpacity style={[styles.botao, styles.botaoSec]} onPress={() => setCriando(false)}>
                  <Text style={[styles.botaoTexto, { color: colors.texto }]}>Cancelar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.botao} onPress={salvar} disabled={salvando}>
                {salvando ? <ActivityIndicator color={colors.branco} /> : <Text style={styles.botaoTexto}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity onPress={() => supabase.auth.signOut()}>
        <Text style={styles.sair}>Sair da conta da família</Text>
      </TouchableOpacity>
      <Rodape claro />
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.navy, paddingTop: 56 },
  topo: { alignItems: 'center', paddingHorizontal: spacing.xl },
  logo: { color: colors.branco, fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  pergunta: { color: colors.branco, fontSize: 22, fontWeight: '700', marginTop: spacing.xl },
  conteudo: { padding: spacing.xl, gap: spacing.xl },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xl },
  perfil: { width: 120, alignItems: 'center', gap: spacing.sm },
  avatar: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarNovo: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.textoClaro, backgroundColor: 'transparent' },
  inicial: { color: colors.branco, fontSize: 40, fontWeight: '800' },
  nome: { color: colors.branco, fontSize: 16, fontWeight: '700' },
  erro: { color: colors.branco, backgroundColor: colors.vermelho, padding: spacing.md, borderRadius: radius.md },
  cartao: { backgroundColor: colors.branco, borderRadius: radius.xl, padding: spacing.xl },
  cartaoTitulo: { fontSize: 18, fontWeight: '800', color: colors.texto, marginBottom: spacing.md },
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
  rotulo: { fontSize: 13, fontWeight: '600', color: colors.textoSuave, marginTop: spacing.lg, marginBottom: spacing.sm },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cor: { width: 44, height: 44, borderRadius: 22 },
  corEscolhida: { borderWidth: 4, borderColor: colors.navy },
  botoes: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  botao: { flex: 1, backgroundColor: colors.verde, borderRadius: radius.md, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  botaoSec: { backgroundColor: colors.fundo },
  botaoTexto: { color: colors.branco, fontWeight: '800', fontSize: 16 },
  sair: { color: colors.textoClaro, textAlign: 'center', fontSize: 13, paddingVertical: spacing.sm },
});
