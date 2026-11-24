'use server'

import { updateTag } from 'next/cache'

/** Limpa o cache da configuração do grupo (nome, escudo, cores, agenda) depois de salvar. */
export async function configAtualizada() {
  updateTag('config')
}
