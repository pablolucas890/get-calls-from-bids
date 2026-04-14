import { Item } from "../global/props"
import { ask } from "../lib/ask"

export async function getBidsFromGov(KEYS_TO_INCLUDE: string[], allItens: Item[]) {
console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')
console.log('[GOV.BR]\n') 
if ((await ask('Deseja buscar editais no Gov.BR? [Y = Sim, N = Não] (default: Y)'))) {
  const govBrMaxPages = (await ask('Quantas páginas deseja buscar? [default: 1]', 'input')) || 1
  for (const key of KEYS_TO_INCLUDE) {
    for (let i = 0; i < govBrMaxPages; i++) {
      const govBrUrl = 'https://pncp.gov.br/api/search/?tipos_documento=edital&ordenacao=-data&pagina=' + (i + 1) + '&tam_pagina=10&status=recebendo_proposta&modalidades=6%7C8&tipos=1&q='
      const govBrResponse = await fetch(govBrUrl + key).then(res => res.json())
      console.log(`Buscando editais para a chave: [${key}] na página: [${i + 1}]`)
      for (const item of govBrResponse?.items ?? []) {
        const description = item.description
        const links = `https://pncp.gov.br${item.item_url.replace('compras', 'editais')}`
        if (allItens.some(e => e.links === links || e.description === description)) continue
        allItens.push({ description, links })
      }
    }
  }
}
}