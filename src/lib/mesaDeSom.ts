import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Efeito } from '../data/api';

// Cuida de todos os sons de uma leitura: os efeitos (lobo, porta, vento...)
// e a trilha de fundo, que toca baixinho e abaixa sozinha quando um efeito toca.
export class MesaDeSom {
  private efeitos = new Map<string, AudioPlayer>();
  private trilha: AudioPlayer | null = null;
  private volumeTrilha = 0.15;
  private trilhaLigada = true;
  private timerVolta: ReturnType<typeof setTimeout> | null = null;
  // Nenhum efeito toca mais que isso (segundos): no fim ele some devagar.
  private static DURACAO_PADRAO = 6;
  private cortes = new Map<string, ReturnType<typeof setTimeout>>();
  private fades = new Map<string, ReturnType<typeof setInterval>>();

  async preparar(efeitos: Efeito[], trilhaUrl: string | null, volumeTrilha: number) {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    }).catch(() => {});

    for (const e of efeitos) {
      if (!e.arquivo_url || this.efeitos.has(e.id)) continue;
      this.efeitos.set(e.id, createAudioPlayer({ uri: e.arquivo_url }));
    }
    this.volumeTrilha = volumeTrilha;
    if (trilhaUrl) {
      this.trilha = createAudioPlayer({ uri: trilhaUrl });
      this.trilha.loop = true;
      this.trilha.volume = volumeTrilha;
    }
  }

  temTrilha() {
    return !!this.trilha;
  }

  iniciarTrilha() {
    if (this.trilha && this.trilhaLigada) this.trilha.play();
  }

  pausarTrilha() {
    this.trilha?.pause();
  }

  // Fim da história: a trilha vai sumindo devagar e para.
  encerrarTrilha() {
    const t = this.trilha;
    if (!t) return;
    if (this.timerVolta) clearTimeout(this.timerVolta);
    let passo = 0;
    const inicial = t.volume;
    const timer = setInterval(() => {
      passo++;
      if (this.trilha !== t || passo >= 10) {
        clearInterval(timer);
        try {
          t.pause();
          t.volume = this.volumeTrilha;
        } catch {}
        return;
      }
      t.volume = inicial * (1 - passo / 10);
    }, 200);
  }

    // `tocarAgora`: só começa a tocar se o microfone estiver ligado.
  ligarTrilha(ligada: boolean, tocarAgora: boolean) {
    this.trilhaLigada = ligada;
    if (!this.trilha) return;
    if (ligada && tocarAgora) {
      this.trilha.volume = this.volumeTrilha;
      this.trilha.play();
    } else {
      this.trilha.pause();
    }
  }

  tocar(efeito: Efeito) {
    const p = this.efeitos.get(efeito.id);
    if (!p) return;
    const volume = Math.max(0, Math.min(1, efeito.volume));
    this.limparCorte(efeito.id);
    p.volume = volume;
    p.seekTo(0).catch(() => {});
    p.play();

    // Sons longos (chuva, vento...) param sozinhos, sumindo devagar.
    const max = efeito.duracao_max ?? MesaDeSom.DURACAO_PADRAO;
    this.cortes.set(
      efeito.id,
      setTimeout(() => {
        let passo = 0;
        const fade = setInterval(() => {
          passo++;
          if (passo >= 8) {
            this.limparCorte(efeito.id);
            try {
              p.pause();
              p.volume = volume;
            } catch {}
            return;
          }
          try {
            p.volume = volume * (1 - passo / 8);
          } catch {}
        }, 100);
        this.fades.set(efeito.id, fade);
      }, Math.max(0.5, max - 0.8) * 1000)
    );

    // A trilha abaixa enquanto o efeito toca e volta depois.
    if (this.trilha && this.trilhaLigada) {
      this.trilha.volume = this.volumeTrilha * 0.3;
      if (this.timerVolta) clearTimeout(this.timerVolta);
      this.timerVolta = setTimeout(() => {
        if (this.trilha) this.trilha.volume = this.volumeTrilha;
      }, 3500);
    }
  }

  private limparCorte(id: string) {
    const c = this.cortes.get(id);
    if (c) clearTimeout(c);
    this.cortes.delete(id);
    const f = this.fades.get(id);
    if (f) clearInterval(f);
    this.fades.delete(id);
  }

  liberar() {
    if (this.timerVolta) clearTimeout(this.timerVolta);
    for (const id of [...this.cortes.keys(), ...this.fades.keys()]) this.limparCorte(id);
    for (const p of this.efeitos.values()) {
      try {
        p.remove();
      } catch {}
    }
    this.efeitos.clear();
    try {
      this.trilha?.remove();
    } catch {}
    this.trilha = null;
  }
}
