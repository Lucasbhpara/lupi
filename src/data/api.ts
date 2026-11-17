import { supabase } from '../lib/supabase';

export type Perfil = { id: string; nome: string; cor: string | null; avatar: string | null };

export type HistoriaResumo = {
  id: string;
  titulo: string;
  resumo: string | null;
  capa_url: string | null;
  faixa_etaria: string | null;
  cor: string | null;
  cena: string | null; // desenho da primeira página, usado como capa
  totalSons: number;
  progresso: number; // 0 a 100, da leitura mais recente deste perfil
  concluida: boolean;
  favorita: boolean;
};

export type Efeito = { id: string; nome: string; arquivo_url: string | null; volume: number };

export type Gatilho = { id: string; palavra_chave: string; ordem: number; efeito: Efeito };

export type Pagina = { ordem: number; texto: string; imagem_url: string | null; cena: string | null; cor: string | null };

export type Historia = {
  id: string;
  titulo: string;
  texto: string;
  cor: string | null;
  paginas: Pagina[];
  trilha_url: string | null;
  trilha_volume: number;
  gatilhos: Gatilho[];
};

function falhou(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

// ---------- Perfis ----------

export async function listarPerfis(): Promise<Perfil[]> {
  const { data, error } = await supabase.from('perfis').select('id, nome, cor, avatar').order('criado_em');
  falhou(error);
  return data ?? [];
}

export async function criarPerfil(nome: string, cor: string, avatar: string): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfis')
    .insert({ nome: nome.trim(), cor, avatar })
    .select('id, nome, cor, avatar')
    .single();
  falhou(error);
  return data as Perfil;
}

export async function atualizarPerfil(id: string, nome: string, cor: string, avatar: string): Promise<Perfil> {
  const { data, error } = await supabase
    .from('perfis')
    .update({ nome: nome.trim(), cor, avatar })
    .eq('id', id)
    .select('id, nome, cor, avatar')
    .single();
  falhou(error);
  return data as Perfil;
}

// ---------- Estante ----------

export async function listarEstante(perfilId: string): Promise<HistoriaResumo[]> {
  const [hist, leituras, favs] = await Promise.all([
    supabase
      .from('historias')
      .select('id, titulo, resumo, capa_url, faixa_etaria, cor, historia_paginas(ordem, cena), historia_gatilhos(count)')
      .eq('status', 'publicada')
      .order('titulo'),
    supabase
      .from('leituras')
      .select('historia_id, progresso, concluida_em, iniciada_em')
      .eq('perfil_id', perfilId)
      .order('iniciada_em', { ascending: false }),
    supabase.from('favoritos').select('historia_id').eq('perfil_id', perfilId),
  ]);
  falhou(hist.error);
  falhou(leituras.error);
  falhou(favs.error);

  // Fica só a leitura mais recente de cada história.
  const ultima = new Map<string, { progresso: number; concluida: boolean }>();
  for (const l of leituras.data ?? []) {
    if (!ultima.has(l.historia_id)) ultima.set(l.historia_id, { progresso: l.progresso, concluida: !!l.concluida_em });
  }
  const favoritas = new Set((favs.data ?? []).map((f) => f.historia_id));

  return (hist.data ?? []).map((h: any) => ({
    id: h.id,
    titulo: h.titulo,
    resumo: h.resumo,
    capa_url: h.capa_url,
    faixa_etaria: h.faixa_etaria,
    cor: h.cor,
    cena: [...(h.historia_paginas ?? [])].sort((a: any, b: any) => a.ordem - b.ordem)[0]?.cena ?? null,
    totalSons: h.historia_gatilhos?.[0]?.count ?? 0,
    progresso: ultima.get(h.id)?.progresso ?? 0,
    concluida: ultima.get(h.id)?.concluida ?? false,
    favorita: favoritas.has(h.id),
  }));
}

export async function marcarFavorita(perfilId: string, historiaId: string, favorita: boolean) {
  if (favorita) {
    const { error } = await supabase.from('favoritos').upsert({ perfil_id: perfilId, historia_id: historiaId });
    falhou(error);
  } else {
    const { error } = await supabase.from('favoritos').delete().eq('perfil_id', perfilId).eq('historia_id', historiaId);
    falhou(error);
  }
}

// ---------- Leitura ----------

export async function carregarHistoria(id: string): Promise<Historia> {
  const { data, error } = await supabase
    .from('historias')
    .select(
      'id, titulo, texto, cor, trilha_url, trilha_volume, historia_paginas(ordem, texto, imagem_url, cena, cor), historia_gatilhos(id, palavra_chave, ordem, efeitos_sonoros(id, nome, arquivo_url, volume))'
    )
    .eq('id', id)
    .single();
  falhou(error);
  const h: any = data;
  const gatilhos: Gatilho[] = (h.historia_gatilhos ?? [])
    .filter((g: any) => g.efeitos_sonoros)
    .map((g: any) => ({
      id: g.id,
      palavra_chave: g.palavra_chave,
      ordem: g.ordem,
      efeito: {
        id: g.efeitos_sonoros.id,
        nome: g.efeitos_sonoros.nome,
        arquivo_url: g.efeitos_sonoros.arquivo_url,
        volume: Number(g.efeitos_sonoros.volume ?? 1),
      },
    }))
    .sort((a: Gatilho, b: Gatilho) => a.ordem - b.ordem);
  // Histórias sem páginas cadastradas viram uma página só, com o texto todo.
  const paginas: Pagina[] = (h.historia_paginas ?? [])
    .map((p: any) => ({ ordem: p.ordem, texto: p.texto, imagem_url: p.imagem_url, cena: p.cena, cor: p.cor }))
    .sort((a: Pagina, b: Pagina) => a.ordem - b.ordem);
  if (paginas.length === 0) paginas.push({ ordem: 1, texto: h.texto, imagem_url: null, cena: null, cor: null });
  return {
    id: h.id,
    titulo: h.titulo,
    texto: h.texto,
    cor: h.cor,
    paginas,
    trilha_url: h.trilha_url,
    trilha_volume: Number(h.trilha_volume ?? 0.15),
    gatilhos,
  };
}

export async function iniciarLeitura(perfilId: string, historiaId: string): Promise<string> {
  const { data, error } = await supabase
    .from('leituras')
    .insert({ perfil_id: perfilId, historia_id: historiaId })
    .select('id')
    .single();
  falhou(error);
  return (data as { id: string }).id;
}

export async function salvarProgresso(leituraId: string, progresso: number, concluida: boolean) {
  const { error } = await supabase
    .from('leituras')
    .update({ progresso, concluida_em: concluida ? new Date().toISOString() : null })
    .eq('id', leituraId);
  falhou(error);
}
