// Comparação entre o que o microfone ouviu e as palavras-gatilho.
// O reconhecimento de voz erra acento, pontuação e às vezes troca uma
// palavrinha ("bateu à porta" no lugar de "bateu na porta"), então a busca
// é tolerante: compara sem acento e aceita pequenas diferenças.

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

type Palavra = { p: string; ini: number; fim: number };

function palavras(texto: string): Palavra[] {
  const lista: Palavra[] = [];
  const re = /[a-z0-9]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) lista.push({ p: m[0], ini: m.index, fim: m.index + m[0].length });
  return lista;
}

// Palavras curtas (na, a, o, de...) são as que o reconhecimento mais troca;
// elas não precisam bater para a frase contar.
function importante(p: string) {
  return p.length > 3;
}

function parecida(ouvida: string, esperada: string) {
  if (ouvida === esperada) return true;
  // "soprou" x "soprando", "uivou" x "uivando": mesmo começo de palavra.
  const raiz = Math.min(5, esperada.length - 1);
  return esperada.length >= 5 && ouvida.length >= raiz && ouvida.slice(0, raiz) === esperada.slice(0, raiz);
}

/**
 * Procura a frase (já normalizada) dentro do texto ouvido (já normalizado),
 * a partir da posição `inicio`. Devolve onde ela termina, ou -1.
 */
export function acharFrase(ouvido: string, frase: string, inicio: number): { pos: number; fim: number } | null {
  if (!frase) return null;

  // 1) Exata, palavra inteira.
  let i = ouvido.indexOf(frase, inicio);
  while (i >= 0) {
    const antes = i === 0 || ouvido[i - 1] === ' ';
    const depois = i + frase.length === ouvido.length || ouvido[i + frase.length] === ' ';
    if (antes && depois) return { pos: i, fim: i + frase.length };
    i = ouvido.indexOf(frase, i + 1);
  }

  // 2) Tolerante: as palavras importantes da frase, na ordem, com no máximo
  //    uma palavra a mais entre elas.
  const alvo = frase.split(' ').filter(importante);
  if (alvo.length === 0) return null;
  const ouv = palavras(ouvido).filter((w) => w.ini >= inicio);
  for (let k = 0; k < ouv.length; k++) {
    if (!parecida(ouv[k].p, alvo[0])) continue;
    let j = k;
    let ok = true;
    for (let a = 1; a < alvo.length; a++) {
      let achou = -1;
      for (let s = j + 1; s <= j + 3 && s < ouv.length; s++) {
        if (parecida(ouv[s].p, alvo[a])) {
          achou = s;
          break;
        }
      }
      if (achou < 0) {
        ok = false;
        break;
      }
      j = achou;
    }
    if (ok) return { pos: ouv[k].ini, fim: ouv[j].fim };
  }
  return null;
}

/**
 * Onde cada gatilho aparece nas páginas: em qual página e em que trecho do texto
 * dela (para destacar e para saber em que página o som está).
 */
export function localizarGatilhos(paginas: string[], frases: { id: string; palavra_chave: string }[]) {
  const baixas = paginas.map((p) => p.toLowerCase());
  const achados = new Map<string, { pagina: number; ini: number; fim: number }>();
  let pg = 0;
  let pos = 0;
  for (const g of frases) {
    const f = g.palavra_chave.toLowerCase();
    let achou: { pagina: number; ini: number; fim: number } | null = null;
    // Procura a partir de onde parou; se não achar, procura do começo.
    for (const [inicioPg, inicioPos] of [
      [pg, pos],
      [0, 0],
    ] as const) {
      for (let p = inicioPg; p < baixas.length && !achou; p++) {
        const i = baixas[p].indexOf(f, p === inicioPg ? inicioPos : 0);
        if (i >= 0) achou = { pagina: p, ini: i, fim: i + f.length };
      }
      if (achou) break;
    }
    if (!achou) continue;
    achados.set(g.id, achou);
    pg = achou.pagina;
    pos = achou.fim;
  }
  return achados;
}

/** As últimas palavras de uma página: quando o microfone ouve, a página vira. */
export function fraseFinal(textoPagina: string) {
  const palavras = normalizar(textoPagina)
    .split(' ')
    .filter((p) => p && p !== 'fim');
  return palavras.slice(-3).join(' ');
}

/** Onde cada palavra-gatilho aparece no texto da história (para destacar). */
export function marcarGatilhosNoTexto(texto: string, frases: { id: string; palavra_chave: string }[]) {
  const baixo = texto.toLowerCase();
  const marcas: { id: string; ini: number; fim: number }[] = [];
  let cursor = 0;
  for (const g of frases) {
    const f = g.palavra_chave.toLowerCase();
    let i = baixo.indexOf(f, cursor);
    if (i < 0) i = baixo.indexOf(f); // fora de ordem: procura do começo
    if (i < 0) continue;
    if (marcas.some((m) => i < m.fim && i + f.length > m.ini)) continue;
    marcas.push({ id: g.id, ini: i, fim: i + f.length });
    cursor = i + f.length;
  }
  return marcas.sort((a, b) => a.ini - b.ini);
}
