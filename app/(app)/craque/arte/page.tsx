import Link from 'next/link'
import { IconVoltar } from '@/components/icons'
import { carregarCraque } from '@/lib/craque'
import { getContexto } from '@/lib/dados'
import ArteStory from './ArteStory'

export default async function Arte({ searchParams }: { searchParams: Promise<{ rodada?: string }> }) {
  const { rodada } = await searchParams
  const { supabase } = await getContexto()
  const dados = await carregarCraque(supabase, rodada ? Number(rodada) : undefined)

  return (
    <main className="screen">
      <div className="row">
        <Link href="/craque" className="icon-btn" aria-label="Voltar">
          <IconVoltar />
        </Link>
        <h1 className="title" style={{ fontSize: 28 }}>ARTE PARA O STORY</h1>
      </div>
      {dados ? (
        <ArteStory
          rodada={dados.craque.numero}
          data={dados.craque.data}
          nome={dados.craque.nome}
          posicao={dados.posicao}
          nivel={dados.nivel}
          ovr={dados.ovr}
          v={dados.craque.v}
          gols={dados.craque.gols}
          assist={dados.craque.assist}
          pts={dados.craque.pts}
          titulos={dados.titulos}
          media={dados.mediaFmt}
        />
      ) : (
        <div className="vazio">Nenhum craque para gerar arte ainda.</div>
      )}
    </main>
  )
}
