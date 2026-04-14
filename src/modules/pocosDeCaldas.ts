import { XMLParser } from 'fast-xml-parser';
import { Agent, setGlobalDispatcher } from 'undici';
import { Item } from "../global/props";
import { ask } from "../lib/ask.js";

export async function getBidsFromPocosDeCaldas(allItens: Item[]) {

console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')
console.log('[POCOS DE CALDAS]\n')
if ((await ask('Deseja buscar editais no Pocos de Caldas? [Y = Sim, N = Não] (default: Y)'))) {
  const pocosDeCaldasMaxPages = (await ask('Quantas páginas deseja buscar? [default: 10]', 'input')) || 10
  const agent = new Agent({ connect: { rejectUnauthorized: false } });
  setGlobalDispatcher(agent);
  const pocosDeCaldasUrl = 'https://services.pocosdecaldas.mg.gov.br/editais/login.xhtml'
  const headers = {
    'Cache-Control': 'no-cache',
    'Accept': 'application/xml, text/xml, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Cookie': 'JSESSIONID=d5431c1f7670d0a9bd12186a77c4; ' +
      '_ga_9CX7TK4815=GS2.1.s1773239724$o9$g1$t1773239746$j38$l0$h0; ' +
      '_ga=GA1.1.42366458.1752691011; ' +
      '_ga_81T8RNHFB7=GS2.1.s1773239749$o4$g1$t1773239768$j41$l0$h0',
    'DNT': '1',
    'Faces-Request': 'partial/ajax',
    'Host': 'services.pocosdecaldas.mg.gov.br',
    'Origin': 'https://services.pocosdecaldas.mg.gov.br',
    'Priority': 'u=0',
    'Referer': 'https://services.pocosdecaldas.mg.gov.br/editais/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'X-Requested-With': 'XMLHttpRequest'
  };

  for (let i = 0; i < pocosDeCaldasMaxPages; i++) {
    console.log('Buscando editais para os editais de Pocos de Caldas na página: [' + (i + 1) + ']')
    const params = new URLSearchParams();
    const body = params.toString()
    const method = 'POST'

    params.append('javax.faces.partial.ajax', 'true');
    params.append('javax.faces.source', 'formFiles:tabela');
    params.append('javax.faces.partial.execute', 'formFiles:tabela');
    params.append('javax.faces.partial.render', 'formFiles:tabela');
    params.append('formFiles:tabela', 'formFiles:tabela');
    params.append('formFiles:tabela_pagination', 'true');
    params.append('formFiles:tabela_rows', '10');
    params.append('formFiles:tabela_encodeFeature', 'true');
    params.append('formFiles', 'formFiles');
    params.append('javax.faces.ViewState', '2481138648726990370:6291030017349225282');
    params.append('formFiles:tabela_first', (i * 10).toString());

    const response = await fetch(pocosDeCaldasUrl, { method, headers, body })

    const text = await response.text();
    const parser = new XMLParser();
    const obj = parser.parse(text);
    const itens = obj['partial-response']['changes']['update']

    for (const i of itens) {
      for (const j of i.split('<')) {
        if (j.includes('descricaoEdital')) {
          const description = j.split('>')[1].split('\n').filter(e => e != '').join(' ')
          allItens.push({ description, links: pocosDeCaldasUrl })
        }
      }
    }
  }
}
}