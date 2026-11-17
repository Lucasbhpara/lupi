import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { Perfil } from './src/data/api';
import LoginScreen from './src/screens/LoginScreen';
import PerfisScreen from './src/screens/PerfisScreen';
import EstanteScreen from './src/screens/EstanteScreen';
import LeituraScreen from './src/screens/LeituraScreen';
import LimiteDeErro from './src/components/LimiteDeErro';
import { colors } from './src/theme/colors';

// LUPI — você lê a história em voz alta e o app toca os sons na hora certa.
// Fluxo: conta da família → quem vai ouvir (perfil) → estante → leitura.

export default function App() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [lendo, setLendo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessao(s);
      if (!s) {
        setPerfil(null);
        setLendo(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  function tela() {
    if (carregando) {
      return (
        <View style={styles.carregando}>
          <ActivityIndicator size="large" color={colors.branco} />
        </View>
      );
    }
    if (!sessao) return <LoginScreen />;
    if (!perfil) return <PerfisScreen onEscolher={setPerfil} />;
    if (lendo) return <LeituraScreen perfil={perfil} historiaId={lendo} onVoltar={() => setLendo(null)} />;
    return <EstanteScreen perfil={perfil} onTrocarPerfil={() => setPerfil(null)} onLer={setLendo} />;
  }

  return <LimiteDeErro onReiniciar={() => setLendo(null)}>{tela()}</LimiteDeErro>;
}

const styles = StyleSheet.create({
  carregando: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
});
