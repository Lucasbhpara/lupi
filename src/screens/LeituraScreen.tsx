import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Gatilho, Historia, Perfil, carregarHistoria, iniciarLeitura, salvarProgresso } from '../data/api';
import { acharFrase, marcarGatilhosNoTexto, normalizar } from '../lib/frases';
import { MesaDeSom } from '../lib/mesaDeSom';
import { colors, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';

type Props = { perfil: Perfil; historiaId: string; onVoltar: () => void };

export default function LeituraScreen({ perfil, historiaId, onVoltar }: Props) {
  const [historia, setHistoria] = useState<Historia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [trilhaLigada, setTrilhaLigada] = useState(true);
  const [tocados, setTocados] = useState<string[]>([]); // ids dos gatilhos que já tocaram
  const [ultimoSom, setUltimoSom] = useState<string | null>(null);
  const [ouvidoAgora, setOuvidoAgora] = useState('');

  const mesa = useRef(new MesaDeSom()).current;
  const leituraId = useRef<string | null>(null);
  const ouvindoRef = useRef(false);
  const tocadosRef = useRef<Set<string>>(new Set());
  const finais = useRef(''); // tudo o que o microfone já ouviu, frases fechadas
  const consumido = useRef(0); // até onde do texto ouvido já foi conferido
  const timerSom = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- Carregar a história e os sons ----------
  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const h = await carregarHistoria(historiaId);
        if (!ativo) return;
        setHistoria(h);
        await mesa.preparar(
          h.gatilhos.map((g) => g.efeito),
          h.trilha_url,
          h.trilha_volume
        );
        leituraId.current = await iniciarLeitura(perfil.id, historiaId);
      } catch (e: any) {
        if (ativo) setErro(e.message);
      }
    })();
    return () => {
      ativo = false;
      ouvindoRef.current = false;
      ExpoSpeechRecognitionModule.abort();
      if (timerSom.current) clearTimeout(timerSom.current);
      mesa.liberar();
    };
  }, [historiaId, perfil.id, mesa]);

  // ---------- Destaques no texto ----------
  const marcas = useMemo(() => (historia ? marcarGatilhosNoTexto(historia.texto, historia.gatilhos) : []), [historia]);
  const proximo = historia?.gatilhos.find((g) => !tocados.includes(g.id)) ?? null;

  const progresso = useMemo(() => {
    if (!historia || historia.gatilhos.length === 0) return 0;
    // Quanto do texto já foi lido = até o último som que tocou.
    let fim = 0;
    for (const m of marcas) if (tocados.includes(m.id)) fim = Math.max(fim, m.fim);
    const porTexto = Math.round((fim / historia.texto.length) * 100);
    return tocados.length === historia.gatilhos.length ? 100 : Math.min(99, porTexto);
  }, [historia, marcas, tocados]);

  // Salva o progresso no banco sempre que um som novo toca.
  useEffect(() => {
    if (!leituraId.current || tocados.length === 0) return;
    salvarProgresso(leituraId.current, progresso, progresso === 100).catch(() => {});
  }, [tocados.length, progresso]);

  // ---------- Disparar sons ----------
  const disparar = useCallback(
    (g: Gatilho) => {
      tocadosRef.current.add(g.id);
      setTocados(Array.from(tocadosRef.current));
      mesa.tocar(g.efeito);
      setUltimoSom(g.efeito.nome);
      if (timerSom.current) clearTimeout(timerSom.current);
      timerSom.current = setTimeout(() => setUltimoSom(null), 4000);
    },
    [mesa]
  );

  const conferir = useCallback(
    (textoOuvido: string) => {
      if (!historia) return;
      const ouvido = normalizar(textoOuvido);
      if (consumido.current > ouvido.length) consumido.current = ouvido.length;
      // Pode haver mais de um gatilho na mesma frase: confere em sequência.
      for (let volta = 0; volta < 5; volta++) {
        let melhor: { g: Gatilho; pos: number; fim: number } | null = null;
        for (const g of historia.gatilhos) {
          if (tocadosRef.current.has(g.id)) continue;
          const achado = acharFrase(ouvido, normalizar(g.palavra_chave), consumido.current);
          if (achado && (!melhor || achado.pos < melhor.pos)) melhor = { g, ...achado };
        }
        if (!melhor) break;
        consumido.current = melhor.fim;
        disparar(melhor.g);
      }
    },
    [historia, disparar]
  );

  // ---------- Microfone ----------
  useSpeechRecognitionEvent('result', (ev) => {
    const trecho = ev.results?.[0]?.transcript ?? '';
    const completo = `${finais.current} ${trecho}`;
    setOuvidoAgora(trecho);
    conferir(completo);
    if (ev.isFinal) finais.current = completo;
  });

  useSpeechRecognitionEvent('end', () => {
    // O Android desliga sozinho depois de um silêncio: religa enquanto estiver lendo.
    if (ouvindoRef.current) setTimeout(() => ouvindoRef.current && comecarReconhecimento(), 300);
  });

  useSpeechRecognitionEvent('error', (ev) => {
    if (ev.error === 'no-speech' || ev.error === 'speech-timeout' || ev.error === 'aborted') return; // o 'end' religa
    if (ev.error === 'not-allowed') {
      pararDeOuvir();
      setErro('O LUPI precisa da permissão do microfone. Libere nas configurações do celular.');
      return;
    }
    if (ev.error === 'language-not-supported') {
      pararDeOuvir();
      setErro('O reconhecimento de voz em português não está instalado neste celular.');
      return;
    }
    console.warn('Reconhecimento de voz:', ev.error, ev.message);
  });

  function comecarReconhecimento() {
    ExpoSpeechRecognitionModule.start({
      lang: 'pt-BR',
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
    });
  }

  async function ligarMicrofone() {
    setErro(null);
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setErro('Sem a permissão do microfone o LUPI não consegue ouvir a história.');
      return;
    }
    ouvindoRef.current = true;
    setOuvindo(true);
    mesa.iniciarTrilha();
    comecarReconhecimento();
  }

  function pararDeOuvir() {
    ouvindoRef.current = false;
    setOuvindo(false);
    ExpoSpeechRecognitionModule.stop();
    mesa.pausarTrilha();
  }

  function recomecar() {
    tocadosRef.current = new Set();
    setTocados([]);
    finais.current = '';
    consumido.current = 0;
    setOuvidoAgora('');
  }

  function alternarTrilha(v: boolean) {
    setTrilhaLigada(v);
    mesa.ligarTrilha(v, ouvindoRef.current);
  }

  // ---------- Tela ----------
  if (!historia) {
    return (
      <View style={[styles.fundo, { alignItems: 'center', justifyContent: 'center', padding: spacing.xl }]}>
        {erro ? (
          <>
            <Text style={styles.erro}>{erro}</Text>
            <TouchableOpacity style={[styles.botaoRedondo, { marginTop: spacing.lg }]} onPress={onVoltar}>
              <Text style={styles.botaoRedondoTexto}>‹</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.navy} />
        )}
      </View>
    );
  }

  const paragrafos = montarParagrafos(historia.texto, marcas, tocados, proximo?.id ?? null);

  return (
    <View style={styles.fundo}>
      <StatusBar style="light" />
      <View style={styles.topo}>
        <View style={styles.linhaTopo}>
          <TouchableOpacity style={styles.botaoTopo} onPress={onVoltar} accessibilityLabel="Voltar para a estante">
            <Text style={styles.botaoTopoTexto}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.titulo} numberOfLines={1}>
            {historia.titulo}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.barra}>
          <View style={[styles.barraCheia, { width: `${progresso}%` }]} />
        </View>
        <View style={styles.linhaInfo}>
          <Text style={styles.info}>{progresso}% lido</Text>
          <Text style={styles.info}>
            {tocados.length} de {historia.gatilhos.length} sons tocados
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo}>
        {ultimoSom && (
          <View style={styles.tocando}>
            <View style={styles.tocandoBolinha} />
            <Text style={styles.tocandoTexto}>Tocando: {ultimoSom}</Text>
          </View>
        )}

        {!!historia.trilha_url && (
          <View style={styles.trilha}>
            <View style={{ flex: 1 }}>
              <Text style={styles.trilhaTitulo}>Trilha de fundo</Text>
              <Text style={styles.trilhaInfo}>
                {trilhaLigada ? 'Volume baixo · abaixa sozinha quando um som toca' : 'Desligada'}
              </Text>
            </View>
            <Switch
              value={trilhaLigada}
              onValueChange={alternarTrilha}
              trackColor={{ true: colors.verde, false: colors.textoClaro }}
              thumbColor={colors.branco}
              accessibilityLabel="Trilha de fundo"
            />
          </View>
        )}

        {erro && <Text style={styles.erro}>{erro}</Text>}

        <View style={styles.pagina}>
          {paragrafos.map((partes, i) => (
            <Text key={i} style={styles.paragrafo}>
              {partes.map((p, j) => (
                <Text
                  key={j}
                  style={p.tipo === 'tocado' ? styles.tocado : p.tipo === 'proximo' ? styles.proximo : p.tipo === 'gatilho' ? styles.gatilho : undefined}
                >
                  {p.texto}
                </Text>
              ))}
            </Text>
          ))}
        </View>

        {ouvindo && !!ouvidoAgora && (
          <Text style={styles.ouvido} numberOfLines={2}>
            Ouvindo: “{ouvidoAgora}”
          </Text>
        )}

        <Rodape />
      </ScrollView>

      <View style={styles.controles}>
        <TouchableOpacity style={styles.botaoLateral} onPress={recomecar} accessibilityLabel="Recomeçar os sons da história">
          <Text style={styles.botaoLateralTexto}>↺</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={[styles.mic, ouvindo ? styles.micLigado : styles.micDesligado]}
            onPress={ouvindo ? pararDeOuvir : ligarMicrofone}
            accessibilityLabel={ouvindo ? 'Pausar o microfone' : 'Ligar o microfone'}
          >
            <Text style={styles.micIcone}>{ouvindo ? '❚❚' : '●'}</Text>
          </TouchableOpacity>
          <Text style={[styles.micStatus, { color: ouvindo ? colors.verde : colors.textoSuave }]}>
            {ouvindo ? 'Ouvindo… pode ler' : 'Toque para começar'}
          </Text>
        </View>
        <View style={{ width: 52 }} />
      </View>
    </View>
  );
}

type Parte = { texto: string; tipo: 'normal' | 'gatilho' | 'tocado' | 'proximo' };

// Quebra o texto em parágrafos e marca as palavras-gatilho:
// verde = já tocou, azul = próxima, sublinhado leve = ainda vai tocar.
function montarParagrafos(texto: string, marcas: { id: string; ini: number; fim: number }[], tocados: string[], proximoId: string | null) {
  const partes: Parte[] = [];
  let pos = 0;
  for (const m of marcas) {
    if (m.ini > pos) partes.push({ texto: texto.slice(pos, m.ini), tipo: 'normal' });
    const tipo = tocados.includes(m.id) ? 'tocado' : m.id === proximoId ? 'proximo' : 'gatilho';
    partes.push({ texto: texto.slice(m.ini, m.fim), tipo });
    pos = m.fim;
  }
  if (pos < texto.length) partes.push({ texto: texto.slice(pos), tipo: 'normal' });

  const paragrafos: Parte[][] = [[]];
  for (const p of partes) {
    const pedacos = p.texto.split(/\n\s*\n/);
    pedacos.forEach((pedaco, i) => {
      if (i > 0) paragrafos.push([]);
      if (pedaco) paragrafos[paragrafos.length - 1].push({ texto: pedaco, tipo: p.tipo });
    });
  }
  return paragrafos.filter((p) => p.length > 0);
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.fundo },
  topo: {
    backgroundColor: colors.navy,
    paddingTop: 48,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    gap: spacing.sm,
  },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  botaoTopo: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' },
  botaoTopoTexto: { color: colors.branco, fontSize: 28, lineHeight: 30, fontWeight: '700' },
  titulo: { flex: 1, textAlign: 'center', color: colors.branco, fontSize: 18, fontWeight: '800' },
  barra: { height: 8, borderRadius: 4, backgroundColor: colors.navy2, overflow: 'hidden', marginTop: spacing.sm },
  barraCheia: { height: 8, backgroundColor: colors.azul },
  linhaInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  info: { color: colors.textoClaro, fontSize: 12 },
  conteudo: { padding: spacing.lg, gap: spacing.md },
  tocando: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.branco,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borda,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tocandoBolinha: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.verde },
  tocandoTexto: { fontSize: 13, fontWeight: '700', color: colors.texto },
  trilha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.branco,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borda,
    padding: spacing.md,
  },
  trilhaTitulo: { fontSize: 13, fontWeight: '700', color: colors.texto },
  trilhaInfo: { fontSize: 12, color: colors.textoSuave },
  erro: { color: colors.branco, backgroundColor: colors.vermelho, padding: spacing.md, borderRadius: radius.md, fontSize: 14 },
  pagina: { backgroundColor: colors.branco, borderRadius: radius.xl, padding: spacing.xl, gap: spacing.lg },
  paragrafo: { fontSize: 22, lineHeight: 35, color: colors.texto, fontWeight: '600' },
  gatilho: { textDecorationLine: 'underline', textDecorationColor: colors.borda },
  proximo: { backgroundColor: colors.azulClaro, color: colors.texto, textDecorationLine: 'underline', textDecorationColor: colors.azul },
  tocado: { color: colors.verde, textDecorationLine: 'underline', textDecorationColor: colors.verde },
  ouvido: { fontSize: 13, color: colors.textoSuave, fontStyle: 'italic', textAlign: 'center' },
  controles: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.branco,
    borderTopWidth: 1,
    borderTopColor: colors.borda,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  botaoLateral: { width: 52, height: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borda, backgroundColor: colors.fundo, alignItems: 'center', justifyContent: 'center' },
  botaoLateralTexto: { fontSize: 24, color: colors.texto },
  mic: { width: 84, height: 84, borderRadius: 42, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  micLigado: { backgroundColor: colors.verde, borderColor: colors.verdeClaro },
  micDesligado: { backgroundColor: colors.navy2, borderColor: colors.borda },
  micIcone: { color: colors.branco, fontSize: 26, fontWeight: '900' },
  micStatus: { fontSize: 13, fontWeight: '700' },
  botaoRedondo: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  botaoRedondoTexto: { color: colors.branco, fontSize: 28, fontWeight: '700' },
});
