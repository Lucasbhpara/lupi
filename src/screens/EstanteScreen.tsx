import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { HistoriaResumo, Perfil, listarEstante, marcarFavorita } from '../data/api';
import { colors, corClaraDaVez, corDaVez, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';
import Avatar from '../components/Avatar';
import FaixaArcoIris from '../components/FaixaArcoIris';

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
            <Avatar perfil={perfil} tamanho={40} />
            <Text style={styles.perfilNome}>{perfil.nome}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.saudacao}>Oi, {perfil.nome}! Qual história hoje?</Text>
      </View>
      <FaixaArcoIris altura={6} />

      <ScrollView contentContainerStyle={styles.conteudo} refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}>
        {!historias && !erro && <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />}
        {erro && <Text style={styles.erro}>{erro}</Text>}

        {continuar && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Continuar lendo</Text>
            <TouchableOpacity
              style={[styles.continuar, { backgroundColor: corClara(continuar, 0), borderColor: corForte(continuar, 0) }]}
              onPress={() => onLer(continuar.id)}
            >
              <Capa historia={continuar} indice={0} pequena />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.cardTitulo}>{continuar.titulo}</Text>
                <Barra valor={continuar.progresso} cor={corForte(continuar, 0)} />
                <Text style={styles.cardInfo}>{continuar.progresso}% lido</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.secao}>
          <View style={styles.abas}>
            {(['todas', 'favoritas'] as const).map((f) => (
              <TouchableOpacity key={f} style={[styles.aba, filtro === f && styles.abaAtiva]} onPress={() => setFiltro(f)}>
                <Text style={[styles.abaTexto, filtro === f && styles.abaTextoAtiva]}>{f === 'todas' ? '📚 Estante' : '❤️ Favoritas'}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {historias && lista.length === 0 && (
            <Text style={styles.vazio}>
              {filtro === 'favoritas' ? 'Toque no coração de uma história para guardar aqui.' : 'Nenhuma história publicada ainda.'}
            </Text>
          )}

          <View style={styles.grade}>
            {lista.map((h, i) => (
              <TouchableOpacity
                key={h.id}
                style={[styles.card, { backgroundColor: corClara(h, i), borderColor: corForte(h, i) }]}
                onPress={() => onLer(h.id)}
              >
                <View>
                  <Capa historia={h} indice={i} />
                  <TouchableOpacity
                    style={styles.coracao}
                    onPress={() => alternarFavorita(h)}
                    accessibilityLabel={h.favorita ? 'Tirar das favoritas' : 'Guardar nas favoritas'}
                  >
                    <Text style={{ color: h.favorita ? colors.vermelho : colors.textoClaro, fontSize: 20 }}>{h.favorita ? '♥' : '♡'}</Text>
                  </TouchableOpacity>
                  {h.concluida && (
                    <View style={styles.selo}>
                      <Text style={styles.seloTexto}>⭐ Lida!</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardTitulo} numberOfLines={2}>
                  {h.titulo}
                </Text>
                <Text style={styles.cardInfo}>
                  {h.totalSons} sons{h.faixa_etaria ? ` · ${h.faixa_etaria}` : ''}
                </Text>
                {h.progresso > 0 && !h.concluida && <Barra valor={h.progresso} cor={corForte(h, i)} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Rodape comMensagem />
      </ScrollView>
    </View>
  );
}

// A cor da história (se cadastrada) ou uma cor do arco-íris pela posição.
function corForte(h: HistoriaResumo, i: number) {
  return h.cor || corDaVez(i);
}
function corClara(h: HistoriaResumo, i: number) {
  if (!h.cor) return corClaraDaVez(i);
  return h.cor + '26'; // a mesma cor, bem transparente
}

function Capa({ historia, indice, pequena = false }: { historia: HistoriaResumo; indice: number; pequena?: boolean }) {
  const estilo = pequena ? styles.capaPequena : styles.capa;
  if (historia.capa_url) return <Image source={{ uri: historia.capa_url }} style={estilo} resizeMode="cover" />;
  return (
    <View style={[estilo, styles.capaVazia, { backgroundColor: corForte(historia, indice) }]}>
      <Text style={{ fontSize: pequena ? 28 : 44 }} numberOfLines={1} adjustsFontSizeToFit>
        {historia.cena || historia.titulo.slice(0, 1)}
      </Text>
    </View>
  );
}

function Barra({ valor, cor }: { valor: number; cor: string }) {
  return (
    <View style={styles.barra}>
      <View style={[styles.barraCheia, { width: `${Math.max(0, Math.min(100, valor))}%`, backgroundColor: cor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.fundo },
  topo: { backgroundColor: colors.navy, paddingTop: 48, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { color: colors.branco, fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  perfilBotao: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.navy2, borderRadius: radius.full, padding: 4, paddingRight: 14, minHeight: 48 },
  perfilNome: { color: colors.branco, fontWeight: '800', fontSize: 15 },
  saudacao: { color: colors.branco, fontSize: 21, fontWeight: '800', marginTop: spacing.lg },
  conteudo: { padding: spacing.xl, gap: spacing.xxl },
  erro: { color: colors.branco, backgroundColor: colors.vermelho, padding: spacing.md, borderRadius: radius.md },
  secao: { gap: spacing.md },
  secaoTitulo: { fontSize: 19, fontWeight: '900', color: colors.texto },
  continuar: { flexDirection: 'row', gap: spacing.md, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', borderWidth: 2 },
  abas: { flexDirection: 'row', gap: spacing.sm },
  aba: { paddingHorizontal: spacing.lg, minHeight: 44, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.branco, borderWidth: 1, borderColor: colors.borda },
  abaAtiva: { backgroundColor: colors.navy, borderColor: colors.navy },
  abaTexto: { fontWeight: '800', color: colors.textoSuave, fontSize: 15 },
  abaTextoAtiva: { color: colors.branco },
  vazio: { color: colors.textoSuave, fontSize: 15, paddingVertical: spacing.lg },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: { width: '47.5%', gap: 6, borderRadius: radius.lg, padding: spacing.sm, borderWidth: 2 },
  capa: { width: '100%', aspectRatio: 0.85, borderRadius: radius.md },
  capaPequena: { width: 72, height: 88, borderRadius: radius.md },
  capaVazia: { alignItems: 'center', justifyContent: 'center', padding: 6 },
  coracao: { position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: colors.branco, alignItems: 'center', justifyContent: 'center' },
  selo: { position: 'absolute', bottom: 8, left: 8, backgroundColor: colors.branco, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  seloTexto: { fontSize: 12, fontWeight: '800', color: colors.texto },
  cardTitulo: { fontSize: 16, fontWeight: '900', color: colors.texto },
  cardInfo: { fontSize: 12, color: colors.textoSuave, fontWeight: '600' },
  barra: { height: 8, borderRadius: 4, backgroundColor: colors.branco, overflow: 'hidden' },
  barraCheia: { height: 8 },
});
