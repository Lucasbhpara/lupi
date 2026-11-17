import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { Gatilho, Historia, Perfil, carregarHistoria, iniciarLeitura, salvarProgresso } from '../data/api';
import { acharFrase, fraseFinal, localizarGatilhos, normalizar } from '../lib/frases';
import { MesaDeSom } from '../lib/mesaDeSom';
import { colors, corClaraDaVez, corDaVez, radius, spacing } from '../theme/colors';
import Rodape from '../components/Rodape';
import FaixaArcoIris from '../components/FaixaArcoIris';

type Props = { perfil: Perfil; historiaId: string; onVoltar: () => void };
type Local = { pagina: number; ini: number; fim: number };

export default function LeituraScreen({ perfil, historiaId, onVoltar }: Props) {
  const [historia, setHistoria] = useState<Historia | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ouvindo, setOuvindo] = useState(false);
  const [trilhaLigada, setTrilhaLigada] = useState(true);
  const [tocados, setTocados] = useState<string[]>([]); // ids dos gatilhos que já tocaram
  const [ultimoSom, setUltimoSom] = useState<string | null>(null);
  const [ouvidoAgora, setOuvidoAgora] = useState('');
  const [pagina, setPagina] = useState(0);
  const [terminou, setTerminou] = useState(false);

  const mesa = useRef(new MesaDeSom()).current;
  const leituraId = useRef<string | null>(null);
  const ouvindoRef = useRef(false);
  const paginaRef = useRef(0);
  const tocadosRef = useRef<Set<string>>(new Set());
  const finais = useRef(''); // tudo o que o microfone já ouviu, frases fechadas
  const consumido = useRef(0); // até onde do texto ouvido já foi conferido
  const timerSom = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scroll = useRef<ScrollView>(null);

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

  // ---------- Onde está cada som ----------
  const textos = useMemo(() => (historia ? historia.paginas.map((p) => p.texto) : []), [historia]);
  const locais = useMemo<Map<string, Local>>(
    () => (historia ? localizarGatilhos(textos, historia.gatilhos) : new Map()),
    [historia, textos]
  );
  const finaisDePagina = useMemo(() => textos.map(fraseFinal), [textos]);
  const totalPaginas = textos.length;

  const progresso = terminou ? 100 : totalPaginas ? Math.round((pagina / totalPaginas) * 100) : 0;

  // Salva o progresso quando muda de página ou termina.
  useEffect(() => {
    if (!leituraId.current || (pagina === 0 && !terminou)) return;
    salvarProgresso(leituraId.current, progresso, terminou).catch(() => {});
  }, [pagina, terminou, progresso]);

  // ---------- Páginas ----------
  const irPara = useCallback(
    (nova: number) => {
      if (!historia) return;
      if (nova >= historia.paginas.length) {
        setTerminou(true);
        return;
      }
      const p = Math.max(0, nova);
      paginaRef.current = p;
      setPagina(p);
      setTerminou(false);
      scroll.current?.scrollTo({ y: 0, animated: true });
    },
    [historia]
  );

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
      for (let volta = 0; volta < 6; volta++) {
        const atual = paginaRef.current;
        let melhor: { tipo: 'som' | 'pagina'; g?: Gatilho; pos: number; fim: number } | null = null;
        // Sons da página atual e da seguinte (caso tenham pulado para a frente).
        for (const g of historia.gatilhos) {
          if (tocadosRef.current.has(g.id)) continue;
          const pg = locais.get(g.id)?.pagina ?? atual;
          if (pg < atual || pg > atual + 1) continue;
          const achado = acharFrase(ouvido, normalizar(g.palavra_chave), consumido.current);
          if (achado && (!melhor || achado.pos < melhor.pos)) melhor = { tipo: 'som', g, ...achado };
        }
        // Fim da página atual: vira a página sozinho.
        const fimPg = finaisDePagina[atual];
        if (fimPg) {
          const achado = acharFrase(ouvido, fimPg, consumido.current, false);
          if (achado && (!melhor || achado.pos < melhor.pos)) melhor = { tipo: 'pagina', ...achado };
        }
        if (!melhor) break;
        consumido.current = melhor.fim;
        if (melhor.tipo === 'som' && melhor.g) {
          const pg = locais.get(melhor.g.id)?.pagina ?? atual;
          if (pg > atual) irPara(pg);
          disparar(melhor.g);
        } else {
          // Um respiro antes de virar, para dar tempo de ver a página inteira.
          const proxima = atual + 1;
          paginaRef.current = Math.min(proxima, totalPaginas - 1);
          setTimeout(() => irPara(proxima), 1200);
        }
      }
    },
    [historia, locais, finaisDePagina, disparar, irPara, totalPaginas]
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
    if (ev.error === 'no-speech' || ev.error === 'speech-timeout' || ev.error === 'aborted') return;
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
    ExpoSpeechRecognitionModule.start({ lang: 'pt-BR', interimResults: true, continuous: true, maxAlternatives: 1 });
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

  function lerDeNovo() {
    tocadosRef.current = new Set();
    setTocados([]);
    finais.current = '';
    consumido.current = 0;
    setOuvidoAgora('');
    irPara(0);
  }

  // Rede de segurança: encostar na palavra destacada toca o som na mão.
  function tocarNaMao(id: string) {
    const g = historia?.gatilhos.find((x) => x.id === id);
    if (!g) return;
    if (tocadosRef.current.has(g.id)) {
      mesa.tocar(g.efeito);
      setUltimoSom(g.efeito.nome);
      if (timerSom.current) clearTimeout(timerSom.current);
      timerSom.current = setTimeout(() => setUltimoSom(null), 4000);
    } else {
      disparar(g);
    }
  }

  function alternarTrilha() {
    const v = !trilhaLigada;
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
            <TouchableOpacity style={[styles.botaoGrande, { marginTop: spacing.lg }]} onPress={onVoltar}>
              <Text style={styles.botaoGrandeTexto}>Voltar à estante</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.navy} />
        )}
      </View>
    );
  }

  const corHistoria = historia.cor || colors.azul;
  const pag = historia.paginas[pagina];
  const corPagina = pag.cor || corDaVez(pagina);
  const fundoPagina = corClaraDaVez(pagina);
  const proximoId = historia.gatilhos.find((g) => !tocados.includes(g.id) && locais.get(g.id)?.pagina === pagina)?.id ?? null;
  const partes = montarPartes(pag.texto, pagina, locais, tocados, proximoId);

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
          {historia.trilha_url ? (
            <TouchableOpacity
              style={[styles.botaoTopo, trilhaLigada && { backgroundColor: colors.verde }]}
              onPress={alternarTrilha}
              accessibilityLabel={trilhaLigada ? 'Desligar a música de fundo' : 'Ligar a música de fundo'}
            >
              <Text style={styles.botaoTopoIcone}>{trilhaLigada ? '🎵' : '🔇'}</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
        <View style={styles.barra}>
          <View style={[styles.barraCheia, { width: `${progresso}%`, backgroundColor: corHistoria }]} />
        </View>
        <View style={styles.linhaInfo}>
          <Text style={styles.info}>
            Página {pagina + 1} de {totalPaginas}
          </Text>
          <Text style={styles.info}>
            {tocados.length} de {historia.gatilhos.length} sons
          </Text>
        </View>
      </View>
      <FaixaArcoIris altura={5} />

      <ScrollView ref={scroll} contentContainerStyle={styles.conteudo}>
        {terminou ? (
          <View style={[styles.fim, { borderColor: corHistoria }]}>
            <Text style={styles.fimEmoji}>⭐🎉⭐</Text>
            <Text style={styles.fimTitulo}>Parabéns, {perfil.nome}!</Text>
            <Text style={styles.fimTexto}>Vocês terminaram "{historia.titulo}".</Text>
            <TouchableOpacity style={styles.botaoGrande} onPress={lerDeNovo}>
              <Text style={styles.botaoGrandeTexto}>Ler de novo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.botaoGrande, { backgroundColor: colors.navy }]} onPress={onVoltar}>
              <Text style={styles.botaoGrandeTexto}>Escolher outra história</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Ilustração da página: imagem cadastrada ou a "cena" em desenhos */}
            <View style={[styles.ilustracao, { backgroundColor: fundoPagina, borderColor: corPagina }]}>
              {pag.imagem_url ? (
                <Image source={{ uri: pag.imagem_url }} style={styles.imagem} resizeMode="contain" />
              ) : (
                <Text style={styles.cena} adjustsFontSizeToFit numberOfLines={1}>
                  {pag.cena || '📖'}
                </Text>
              )}
              {ultimoSom && (
                <View style={styles.tocando}>
                  <View style={styles.tocandoBolinha} />
                  <Text style={styles.tocandoTexto}>{ultimoSom}</Text>
                </View>
              )}
            </View>

            {erro && <Text style={styles.erro}>{erro}</Text>}

            <View style={[styles.pagina, { borderColor: corPagina }]}>
              <Text style={styles.paragrafo}>
                {partes.map((p, j) => (
                  <Text
                    key={j}
                    style={p.tipo === 'tocado' ? styles.tocado : p.tipo === 'proximo' ? styles.proximo : p.tipo === 'gatilho' ? styles.gatilho : undefined}
                    onPress={p.id ? () => tocarNaMao(p.id!) : undefined}
                    suppressHighlighting={false}
                  >
                    {p.texto}
                  </Text>
                ))}
              </Text>
            </View>

            <Text style={styles.dicaToque}>Se um som não tocar, encoste na palavra colorida 👆</Text>

            {ouvindo && !!ouvidoAgora && (
              <Text style={styles.ouvido} numberOfLines={2}>
                Ouvindo: “{ouvidoAgora}”
              </Text>
            )}
          </>
        )}
        <Rodape />
      </ScrollView>

      <View style={styles.controles}>
        <TouchableOpacity
          style={[styles.botaoLateral, pagina === 0 && { opacity: 0.35 }]}
          disabled={pagina === 0}
          onPress={() => irPara(pagina - 1)}
          accessibilityLabel="Página anterior"
        >
          <Text style={styles.botaoLateralTexto}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={[styles.mic, ouvindo ? styles.micLigado : styles.micDesligado]}
            onPress={ouvindo ? pararDeOuvir : ligarMicrofone}
            accessibilityLabel={ouvindo ? 'Pausar o microfone' : 'Ligar o microfone'}
          >
            <Text style={styles.micIcone}>{ouvindo ? '❚❚' : '🎤'}</Text>
          </TouchableOpacity>
          <Text style={[styles.micStatus, { color: ouvindo ? colors.verde : colors.textoSuave }]}>
            {ouvindo ? 'Ouvindo… pode ler' : 'Toque para começar'}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.botaoLateral, terminou && { opacity: 0.35 }]}
          disabled={terminou}
          onPress={() => irPara(pagina + 1)}
          accessibilityLabel="Próxima página"
        >
          <Text style={styles.botaoLateralTexto}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type Parte = { texto: string; tipo: 'normal' | 'gatilho' | 'tocado' | 'proximo'; id?: string };

// Marca as palavras-gatilho da página: verde = já tocou, azul = próxima,
// sublinhado leve = ainda vai tocar.
function montarPartes(texto: string, pagina: number, locais: Map<string, Local>, tocados: string[], proximoId: string | null) {
  const marcas = Array.from(locais.entries())
    .filter(([, l]) => l.pagina === pagina)
    .map(([id, l]) => ({ id, ini: l.ini, fim: l.fim }))
    .sort((a, b) => a.ini - b.ini);
  const partes: Parte[] = [];
  let pos = 0;
  for (const m of marcas) {
    if (m.ini < pos) continue;
    if (m.ini > pos) partes.push({ texto: texto.slice(pos, m.ini), tipo: 'normal' });
    const tipo = tocados.includes(m.id) ? 'tocado' : m.id === proximoId ? 'proximo' : 'gatilho';
    partes.push({ texto: texto.slice(m.ini, m.fim), tipo, id: m.id });
    pos = m.fim;
  }
  if (pos < texto.length) partes.push({ texto: texto.slice(pos), tipo: 'normal' });
  return partes;
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: colors.fundo },
  topo: { backgroundColor: colors.navy, paddingTop: 44, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  linhaTopo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  botaoTopo: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.navy2, alignItems: 'center', justifyContent: 'center' },
  botaoTopoTexto: { color: colors.branco, fontSize: 28, lineHeight: 30, fontWeight: '700' },
  botaoTopoIcone: { fontSize: 20 },
  titulo: { flex: 1, textAlign: 'center', color: colors.branco, fontSize: 18, fontWeight: '900' },
  barra: { height: 10, borderRadius: 5, backgroundColor: colors.navy2, overflow: 'hidden', marginTop: spacing.xs },
  barraCheia: { height: 10 },
  linhaInfo: { flexDirection: 'row', justifyContent: 'space-between' },
  info: { color: colors.textoClaro, fontSize: 13, fontWeight: '600' },
  conteudo: { padding: spacing.lg, gap: spacing.md },
  ilustracao: { height: 220, borderRadius: radius.xl, borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: spacing.lg },
  imagem: { width: '100%', height: '100%' },
  cena: { fontSize: 96 },
  tocando: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.branco,
    borderRadius: radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  tocandoBolinha: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.verde },
  tocandoTexto: { fontSize: 13, fontWeight: '800', color: colors.texto },
  erro: { color: colors.branco, backgroundColor: colors.vermelho, padding: spacing.md, borderRadius: radius.md, fontSize: 14 },
  pagina: { backgroundColor: colors.branco, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 2 },
  paragrafo: { fontSize: 23, lineHeight: 36, color: colors.texto, fontWeight: '600' },
  gatilho: { color: colors.azul, textDecorationLine: 'underline', textDecorationColor: colors.azul },
  proximo: { backgroundColor: colors.azulClaro, color: colors.texto, textDecorationLine: 'underline', textDecorationColor: colors.azul },
  tocado: { color: colors.verde, textDecorationLine: 'underline', textDecorationColor: colors.verde },
  dicaToque: { fontSize: 13, color: colors.textoSuave, textAlign: 'center', fontWeight: '600' },
  ouvido: { fontSize: 13, color: colors.textoSuave, fontStyle: 'italic', textAlign: 'center' },
  fim: { backgroundColor: colors.branco, borderRadius: radius.xl, borderWidth: 3, padding: spacing.xxl, alignItems: 'center', gap: spacing.md },
  fimEmoji: { fontSize: 48 },
  fimTitulo: { fontSize: 26, fontWeight: '900', color: colors.texto },
  fimTexto: { fontSize: 17, color: colors.textoSuave, textAlign: 'center', marginBottom: spacing.sm },
  botaoGrande: { alignSelf: 'stretch', backgroundColor: colors.verde, borderRadius: radius.md, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  botaoGrandeTexto: { color: colors.branco, fontWeight: '800', fontSize: 17 },
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
  botaoLateral: { width: 60, height: 60, borderRadius: radius.lg, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  botaoLateralTexto: { fontSize: 36, lineHeight: 40, color: colors.branco, fontWeight: '800' },
  mic: { width: 84, height: 84, borderRadius: 42, borderWidth: 6, alignItems: 'center', justifyContent: 'center' },
  micLigado: { backgroundColor: colors.verde, borderColor: colors.verdeClaro },
  micDesligado: { backgroundColor: colors.navy2, borderColor: colors.borda },
  micIcone: { color: colors.branco, fontSize: 30, fontWeight: '900' },
  micStatus: { fontSize: 13, fontWeight: '800' },
});
