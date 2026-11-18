import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Perfil, listarPerfis, criarPerfil, atualizarPerfil } from '../data/api';
import { supabase } from '../lib/supabase';
import { colors, coresPerfil, simbolosPerfil, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';
import Avatar from '../components/Avatar';
import FaixaArcoIris from '../components/FaixaArcoIris';

const lupi = require('../../assets/lupi.png');

export default function PerfisScreen({ onEscolher }: { onEscolher: (p: Perfil) => void }) {
  const [perfis, setPerfis] = useState<Perfil[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState<Perfil | null>(null);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(coresPerfil[0]);
  const [simbolo, setSimbolo] = useState(simbolosPerfil[0].emoji);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const lista = await listarPerfis();
      setPerfis(lista);
      if (lista.length === 0) abrirNovo();
    } catch (e: any) {
      setErro(e.message);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function abrirNovo() {
    setEditando(null);
    setNome('');
    setCor(coresPerfil[0]);
    setSimbolo(simbolosPerfil[0].emoji);
    setFormAberto(true);
  }

  function abrirEdicao(p: Perfil) {
    setEditando(p);
    setNome(p.nome);
    setCor(p.cor || coresPerfil[0]);
    setSimbolo(p.avatar || simbolosPerfil[0].emoji);
    setFormAberto(true);
  }

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      if (editando) {
        const p = await atualizarPerfil(editando.id, nome, cor, simbolo);
        setPerfis((atual) => (atual ?? []).map((x) => (x.id === p.id ? p : x)));
      } else {
        const p = await criarPerfil(nome, cor, simbolo);
        setPerfis((atual) => [...(atual ?? []), p]);
      }
      setFormAberto(false);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.fundo}>
      <StatusBar style="light" />
      <FaixaArcoIris altura={8} />
      <ScrollView contentContainerStyle={styles.conteudo}>
        <View style={styles.topo}>
          <Image source={lupi} style={styles.lupi} resizeMode="contain" accessibilityLabel="Lupi, o lobinho" />
          <Text style={styles.logo}>LUPI</Text>
          <Text style={styles.pergunta}>Quem vai ouvir hoje?</Text>
        </View>

        {!perfis && !erro && <ActivityIndicator color={colors.branco} size="large" />}
        {erro && <Text style={styles.erro}>{erro}</Text>}

        {!formAberto && (
          <>
            <View style={styles.grade}>
              {(perfis ?? []).map((p) => (
                <TouchableOpacity key={p.id} style={styles.perfil} onPress={() => onEscolher(p)} onLongPress={() => abrirEdicao(p)}>
                  <Avatar perfil={p} tamanho={104} />
                  <Text style={styles.nome} numberOfLines={1}>
                    {p.nome}
                  </Text>
                </TouchableOpacity>
              ))}
              {perfis && (
                <TouchableOpacity style={styles.perfil} onPress={abrirNovo}>
                  <View style={styles.avatarNovo}>
                    <Text style={styles.mais}>+</Text>
                  </View>
                  <Text style={[styles.nome, { color: colors.textoClaro }]}>Novo perfil</Text>
                </TouchableOpacity>
              )}
            </View>
            {(perfis?.length ?? 0) > 0 && <Text style={styles.dica}>Para mudar a cor ou o símbolo, segure o dedo em cima do perfil.</Text>}
          </>
        )}

        {formAberto && (
          <View style={styles.cartao}>
            <FaixaArcoIris altura={6} />
            <View style={styles.cartaoMiolo}>
              <View style={{ alignItems: 'center' }}>
                <Avatar perfil={{ nome: nome || '?', cor, avatar: simbolo }} tamanho={96} />
              </View>
              <Text style={styles.cartaoTitulo}>{editando ? 'Editar perfil' : 'Novo perfil'}</Text>
              <TextInput
                style={styles.campo}
                value={nome}
                onChangeText={setNome}
                placeholder="Nome"
                placeholderTextColor={colors.textoSuave}
                maxLength={20}
              />

              <Text style={styles.rotulo}>Símbolo</Text>
              <View style={styles.simbolos}>
                {simbolosPerfil.map((s) => (
                  <TouchableOpacity
                    key={s.emoji}
                    accessibilityLabel={s.nome}
                    onPress={() => setSimbolo(s.emoji)}
                    style={[styles.simbolo, simbolo === s.emoji && { borderColor: cor, backgroundColor: colors.fundo }]}
                  >
                    <Text style={styles.simboloTexto}>{s.emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

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
                  <TouchableOpacity style={[styles.botao, styles.botaoSec]} onPress={() => setFormAberto(false)}>
                    <Text style={[styles.botaoTexto, { color: colors.texto }]}>Cancelar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.botao} onPress={salvar} disabled={salvando}>
                  {salvando ? <ActivityIndicator color={colors.branco} /> : <Text style={styles.botaoTexto}>Salvar</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        <Rodape claro comMensagem />
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.sair}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.navy, paddingTop: 36 },
  conteudo: { padding: spacing.xl, gap: spacing.xl, paddingBottom: 40 },
  topo: { alignItems: 'center' },
  lupi: { width: 110, height: 110 },
  logo: { color: colors.branco, fontSize: 30, fontWeight: '900', letterSpacing: 3 },
  pergunta: { color: colors.branco, fontSize: 24, fontWeight: '800', marginTop: spacing.lg },
  grade: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xl },
  perfil: { width: 128, alignItems: 'center', gap: spacing.sm },
  avatarNovo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.textoClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mais: { color: colors.textoClaro, fontSize: 44, fontWeight: '700' },
  nome: { color: colors.branco, fontSize: 18, fontWeight: '800' },
  dica: { color: colors.textoClaro, fontSize: 13, textAlign: 'center' },
  erro: { color: colors.branco, backgroundColor: colors.vermelho, padding: spacing.md, borderRadius: radius.md },
  cartao: { backgroundColor: colors.branco, borderRadius: radius.xl, overflow: 'hidden' },
  cartaoMiolo: { padding: spacing.xl },
  cartaoTitulo: { fontSize: 20, fontWeight: '800', color: colors.texto, marginVertical: spacing.md, textAlign: 'center' },
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
  rotulo: { fontSize: 14, fontWeight: '800', color: colors.texto, marginTop: spacing.lg, marginBottom: spacing.sm },
  simbolos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  simbolo: { width: 54, height: 54, borderRadius: radius.md, borderWidth: 3, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  simboloTexto: { fontSize: 30 },
  cores: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  cor: { width: 46, height: 46, borderRadius: 23 },
  corEscolhida: { borderWidth: 4, borderColor: colors.navy },
  botoes: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  botao: { flex: 1, backgroundColor: colors.verde, borderRadius: radius.md, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  botaoSec: { backgroundColor: colors.fundo },
  botaoTexto: { color: colors.branco, fontWeight: '800', fontSize: 17 },
  sair: { color: colors.textoClaro, textAlign: 'center', fontSize: 13, paddingVertical: spacing.sm },
});
