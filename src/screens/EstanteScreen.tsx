import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HistoriaResumo, Perfil, listarEstante, marcarFavorita } from '../data/api';
import { colors, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';

type Props = {
  perfil: Perfil;
  onTrocarPerfil: () => void;
  onLer: (historiaId: string) => void;
};

export default function EstanteScreen({ perfil, onTrocarPerfil, onLer }: Props) {
  const [historias, setHistorias] = useState<HistoriaResumo[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizando, setAtualizando] = useState(false);
  const [filtro, setFiltro] = useState<'todas' | 'favoritas'>('todas');

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      setHistorias(await listarEstante(perfil.id));
    } catch (e: any) {
      setErro(e.message);
    }
  }, [perfil.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function atualizar() {
    setAtualizando(true);
    await carregar();
    setAtualizando(false);
  }

  async function alternarFavorita(h: HistoriaResumo) {
    const nova = !h.favorita;
    setHistorias((lista) => lista?.map((x) => (x.id === h.id ? { ...x, favorita: nova } : x)) ?? null);
    try {
      await marcarFavorita(perfil.id, h.id, nova);
    } catch (e: any) {
      setErro(e.message);
      carregar();
    }
  }

  const continuar = historias?.find((h) => h.progresso > 0 && !h.concluida);
  const lista = (historias ?? []).filter((h) => filtro === 'todas' || h.favorita);

  return (
    <View style={styles.fundo}>
      <StatusBar style="light" />
      <View style={styles.topo}>
        <View style={styles.linhaTopo}>
          <Text style={styles.logo}>LUPI</Text>
          <TouchableOpacity style={styles.perfilBotao} onPress={onTrocarPerfil} accessibilityLabel="Trocar de perfil">
            <View style={[styles.bolinha, { backgroundColor: perfil.cor || colors.azul }]}>
              <Text style={styles.bolinhaTexto}>{perfil.nome.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={styles.perfilNome}>{perfil.nome}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.saudacao}>Oi, {perfil.nome}! Qual história hoje?</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}
      >
        {!historias && !erro && <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />}
        {erro && <Text style={styles.erro}>{erro}</Text>}

        {continuar && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Continuar lendo</Text>
            <View style={styles.continuar}>
              <Capa historia={continuar} pequena />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.cardTitulo}>{continuar.titulo}</Text>
                <Text style={styles.cardInfo}>{continuar.totalSons} sons</Text>
                <Barra valor={continuar.progresso} />
                <Text style={styles.cardInfo}>{continuar.progresso}% lido</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.botaoLer} onPress={() => onLer(continuar.id)}>
              <Text style={styles.botaoLerTexto}>Ler agora</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.secao}>
          <View style={styles.abas}>
            {(['todas', 'favoritas'] as const).map((f) => (
              <TouchableOpacity key={f} style={[styles.aba, filtro === f && styles.abaAtiva]} onPress={() => setFiltro(f)}>
                <Text style={[styles.abaTexto, filtro === f && styles.abaTextoAtiva]}>{f === 'todas' ? 'Estante' : 'Favoritas'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {historias && lista.length === 0 && (
            <Text style={styles.vazio}>
              {filtro === 'favoritas' ? 'Toque no coração de uma história para guardar aqui.' : 'Nenhuma história publicada ainda.'}
            </Text>
          )}

          <View style={styles.grade}>
            {lista.map((h) => (
              <TouchableOpacity key={h.id} style={styles.card} onPress={() => onLer(h.id)}>
                <View>
                  <Capa historia={h} />
                  <TouchableOpacity
                    style={styles.coracao}
                    onPress={() => alternarFavorita(h)}
                    accessibilityLabel={h.favorita ? 'Tirar das favoritas' : 'Guardar nas favoritas'}
                  >
                    <Text style={{ color: h.favorita ? colors.vermelho : colors.textoClaro, fontSize: 18 }}>{h.favorita ? '♥' : '♡'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardTitulo} numberOfLines={2}>
                  {h.titulo}
                </Text>
                {h.faixa_etaria && <Text style={styles.cardInfo}>{h.faixa_etaria}</Text>}
                {h.progresso > 0 && <Barra valor={h.concluida ? 100 : h.progresso} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Rodape />
      </ScrollView>
    </View>
  );
}

function Capa({ historia, pequena = false }: { historia: HistoriaResumo; pequena?: boolean }) {
  const estilo = pequena ? styles.capaPequena : styles.capa;
  if (historia.capa_url) return <Image source={{ uri: historia.capa_url }} style={estilo} resizeMode="cover" />;
  return (
    <View style={[estilo, styles.capaVazia]}>
      <Text style={[styles.capaLetra, pequena && { fontSize: 28 }]}>{historia.titulo.slice(0, 1)}</Text>
    </View>
  );
}

function Barra({ valor }: { valor: number }) {
  return (
    <View style={styles.barra}>
      <View style={[styles.barraCheia, { width: `${Math.max(0, Math.min(100, valor))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.fundo },
  topo: {
    backgroundColor: colors.navy,
    paddingTop: 52,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: colors.branco, fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  perfilBotao: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.navy2, borderRadius: radius.full, padding: 4, paddingRight: 14, minHeight: 44 },
  bolinha: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  bolinhaTexto: { color: colors.branco, fontWeight: '800', fontSize: 16 },
  perfilNome: { color: colors.branco, fontWeight: '700', fontSize: 14 },
  saudacao: { color: colors.branco, fontSize: 20, fontWeight: '700', marginTop: spacing.lg },
  conteudo: { padding: spacing.xl, gap: spacing.xxl },
  erro: { color: colors.branco, backgroundColor: colors.vermelho, padding: spacing.md, borderRadius: radius.md },
  secao: { gap: spacing.md },
  secaoTitulo: { fontSize: 18, fontWeight: '800', color: colors.texto },
  continuar: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.branco, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center' },
  botaoLer: { backgroundColor: colors.verde, borderRadius: radius.md, minHeight: 50, alignItems: 'center', justifyContent: 'center' },
  botaoLerTexto: { color: colors.branco, fontWeight: '800', fontSize: 17 },
  abas: { flexDirection: 'row', gap: spacing.sm },
  aba: { paddingHorizontal: spacing.lg, minHeight: 40, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.branco, borderWidth: 1, borderColor: colors.borda },
  abaAtiva: { backgroundColor: colors.navy, borderColor: colors.navy },
  abaTexto: { fontWeight: '700', color: colors.textoSuave },
  abaTextoAtiva: { color: colors.branco },
  vazio: { color: colors.textoSuave, fontSize: 14, paddingVertical: spacing.lg },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { width: '47%', gap: 6 },
  capa: { width: '100%', aspectRatio: 0.75, borderRadius: radius.lg },
  capaPequena: { width: 72, height: 96, borderRadius: radius.md },
  capaVazia: { backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' },
  capaLetra: { color: colors.azul, fontSize: 56, fontWeight: '900' },
  coracao: { position: 'absolute', top: 8, right: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: colors.branco, alignItems: 'center', justifyContent: 'center' },
  cardTitulo: { fontSize: 15, fontWeight: '800', color: colors.texto },
  cardInfo: { fontSize: 12, color: colors.textoSuave },
  barra: { height: 8, borderRadius: 4, backgroundColor: colors.borda, overflow: 'hidden' },
  barraCheia: { height: 8, backgroundColor: colors.verde },
});
