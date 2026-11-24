import { nomeExibicao, type Perfil } from '@/lib/util'

/** Link do WhatsApp com a mensagem de convite pronta para o jogador. */
export function linkConvite(j: Pick<Perfil, 'nome' | 'apelido' | 'telefone'>, grupo: string, origem: string) {
  const nome = nomeExibicao(j).split(' ')[0]
  const texto =
    `Fala, ${nome}! O app do ${grupo} está no ar e seus números já estão lá ⚽\n\n` +
    `1. Abra ${origem}\n2. Coloque este celular\n3. Crie um PIN de 6 números\n\n` +
    `Lá tem o ranking, sua carta e seus gols e assistências.`
  return `https://wa.me/${j.telefone}?text=${encodeURIComponent(texto)}`
}
