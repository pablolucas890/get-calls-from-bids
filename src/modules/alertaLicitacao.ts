import { Item } from "../global/props"
import { ask } from "../lib/ask"

export async function getBidsFromAlertalicitacao(allItens: Item[]) {
console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')
console.log('[ALERTALICITAÇÃO]\n')
if ((await ask('Deseja buscar editais no Alertalicitacao? [Y = Sim, N = Não] (default: Y)'))) {
  const cnaeNumbers = [985, 986, 987, 988]
  const alertaLicitacaoMaxPages = (await ask('Quantas páginas deseja buscar? [default: 5]', 'input')) || 5
  const cnaeUrl = 'https://alertalicitacao.com.br'
  for (const cnaeNumber of cnaeNumbers) {
    console.log('Buscando editais para o CNAE: [' + cnaeNumber + ']')
    for (let i = 0; i < alertaLicitacaoMaxPages; i++) {
      console.log('Buscando editais para o CNAE: [' + cnaeNumber + '] na página: [' + (i + 1) + ']')
      const cnaeResponse = await fetch(cnaeUrl + '/!cnae/' + cnaeNumber);
      const cnaeText = await cnaeResponse.text();
      cnaeText.replace(/[\r\n]+/g, ' ').split('Cadastrar-se')[1].split('panel').forEach(e => {
        const description = e.split('no-class')[1]?.split('</b>')[1].trim()?.split('</p>')[0].trim().replace(/[.]+/g, '')
        const href = e.split('href =')[1]?.split('title=')[0].replace(/['"]/g, '')
        const links = cnaeUrl + href + ', ' + cnaeUrl + '/!cnae/' + cnaeNumber
        if (description && href && !allItens.some(e => e.links === links || e.description === description)) {
          allItens.push({ description, links })
        }
      })
    }
  }
}
}