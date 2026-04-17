import { Item } from "../global/props"
import { ask } from "../lib/ask"

export async function getBidsFromPortalContasPublicas(KEYS_TO_INCLUDE: string[], allItens: Item[], portalDeContasPages?: number) {
console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')
console.log('[PORTAL DE COMPRAS PÚBLICAS]\n')
if (portalDeContasPages ? portalDeContasPages > 0 : (await ask('Deseja buscar editais no Portal de Compras Públicas? [Y = Sim, N = Não] (default: Y)'))) {
  let portalDeContasMaxPages = 2
  if (portalDeContasPages) {
    portalDeContasMaxPages = portalDeContasPages
  } else {
    portalDeContasMaxPages = (await ask('Quantas páginas deseja buscar? [default: 2]', 'input')) || 2
  }
  const portalDeContasUrl = 'https://compras.api.portaldecompraspublicas.com.br/v2/licitacao/processos?limitePagina=12&filtroOrdenacao=3&objeto='
  for (let i = 0; i < KEYS_TO_INCLUDE.length; i++) {
    const key = KEYS_TO_INCLUDE[i]
    for (let j = 0; j < portalDeContasMaxPages; j++) {
      console.log('Buscando editais para a chave: [' + key + '] na página: ' + (j + 1))
      let portalDeContasResponse: any = null
      try {
        portalDeContasResponse = await fetch(portalDeContasUrl + key + '&pagina=' + j).then(res => res.json()) as any
      } catch (error) {
        console.log(`Erro ao buscar editais para a chave: [${key}] na página: [${j + 1}]`)
        continue
      }
      for (const item of portalDeContasResponse?.result ?? []) {
        const links = `https://www.portaldecompraspublicas.com.br/processos${item.urlReferencia}`
        const processStatus = item?.statusProcessoPublico?.descricao ?? ''
        const description = item.resumo
        if (processStatus === 'Recebendo Propostas' || processStatus === 'Aguardando Inicio de Recebimento de Propostas') {
          if (allItens.some(e => e.links === links || e.description === description)) continue
          allItens.push({ description, links })
        }
      }
    }
  }
}
}