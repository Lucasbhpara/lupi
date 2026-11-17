// Paleta do LUPI: a base da identidade do ULVA (azul-marinho, fundo claro)
// com as cores do arco-íris do símbolo da neurodiversidade (o infinito).

export const colors = {
  navy: '#0E1B2C', // principal / cabeçalho
  navy2: '#16273D', // faixas secundárias
  azul: '#2F7BFF', // destaque
  azulClaro: '#DCE8FF',
  fundo: '#F6F4FB', // fundo geral, levemente lilás
  verde: '#22A06B', // positivo / microfone ligado
  verdeClaro: '#CDEBDD',
  laranja: '#F59E0B',
  vermelho: '#E5484D', // favorito
  texto: '#0E1B2C',
  textoSuave: '#5B6675',
  textoClaro: '#B8C4D4',
  borda: '#E3E8EF',
  branco: '#FFFFFF',
};

// As seis cores do infinito arco-íris.
export const arcoIris = ['#E5484D', '#F59E0B', '#F5C518', '#22A06B', '#2F7BFF', '#8B5CF6'];

// Versões clarinhas para fundos de cartões e páginas (texto escuro por cima).
export const arcoIrisClaro = ['#FDE2E3', '#FEEBC8', '#FEF6C7', '#D3F2E3', '#DCE8FF', '#EAE1FE'];

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

// Cores que a criança escolhe para o perfil.
export const coresPerfil = arcoIris;

// Símbolos que a criança escolhe para o perfil.
export const simbolosPerfil = [
  { emoji: '⚽', nome: 'Bola' },
  { emoji: '🚗', nome: 'Carrinho' },
  { emoji: '🪆', nome: 'Boneca' },
  { emoji: '🧸', nome: 'Ursinho' },
  { emoji: '🦖', nome: 'Dinossauro' },
  { emoji: '🦄', nome: 'Unicórnio' },
  { emoji: '🚀', nome: 'Foguete' },
  { emoji: '🤖', nome: 'Robô' },
  { emoji: '🐶', nome: 'Cachorrinho' },
  { emoji: '🐱', nome: 'Gatinho' },
  { emoji: '🦁', nome: 'Leão' },
  { emoji: '🐼', nome: 'Panda' },
  { emoji: '🦸', nome: 'Super-herói' },
  { emoji: '🧚', nome: 'Fada' },
  { emoji: '🚒', nome: 'Caminhão de bombeiro' },
  { emoji: '🎈', nome: 'Balão' },
];

export function corDaVez(i: number) {
  return arcoIris[((i % arcoIris.length) + arcoIris.length) % arcoIris.length];
}
export function corClaraDaVez(i: number) {
  return arcoIrisClaro[((i % arcoIrisClaro.length) + arcoIrisClaro.length) % arcoIrisClaro.length];
}
