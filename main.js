import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import inquirer from 'inquirer';
import { Agent, setGlobalDispatcher } from 'undici';

const KEYS_TO_INCLUDE = fs.readFileSync('public/keys-include.txt', 'utf8').split('\n').filter(e => e.trim() !== '').map(e => e.trim())
const KEYS_TO_EXCLUDE = fs.readFileSync('public/keys-exclude.txt', 'utf8').split('\n').filter(e => e.trim() !== '').map(e => e.trim())

let allItens = []
let deletedItens = JSON.parse(fs.existsSync('public/deleted.json') ? fs.readFileSync('public/deleted.json', 'utf8') || '[]' : '[]')
let readLaterItens = JSON.parse(fs.existsSync('public/read-later.json') ? fs.readFileSync('public/read-later.json', 'utf8') || '[]' : '[]')

const showHelp = fs.existsSync('public/show-help.txt')
const message = 'Precione qualquer tecla para continuar...'

// Bootstrapping
if (!showHelp) {
  const helpTextToShow = [
    '[TIPO] Nesta linha você saberá se é um novo edital ou se é um edital que você já leu e marcou para ler mais tarde\n\n',
    '[PALAVRA-CHAVE] Nesta linha você saberá a palavra-chave que foi usada para encontrar o edital como "SOFTWARE", "SISTEMA"\n\n',
    '[DESCRIÇÃO]\n\n\tNesta linha você saberá a descrição do edital e poderá optar por descartar ou ler mais tarde\n\n',
    '[LINKS] Nesta linha você verá os link para o edital, exemplo\n\thttps://linkdeexemplo.com.br\n\thttps://linkdeexemplo.com.br\n\thttps://linkdeexemplo.com.br\n\n',
    'No final você poderá optar por descartar ou ler mais tarde\n\n'
  ]
  let helpTextShowed = ''
  const firstWordTimeout = 2000
  const otherWordTimeout = 50

  console.clear()
  console.log('\n\n\t\tEste é um script para ajudar a Amoradev a encontrar novos editais de desenvolvimento de software.\n\n')
  await inquirer.prompt([{ message }])
  console.clear()

  for (const line of helpTextToShow) {
    for (let j = 0; j < line.split(' ').length; j++) {
      const word = line.split(' ')[j]
      helpTextShowed += word + ' '
      console.clear()
      console.log(helpTextShowed)
      await new Promise(resolve => setTimeout(resolve, j === 0 ? firstWordTimeout : otherWordTimeout))
    }
    await inquirer.prompt([{ message }])
    helpTextShowed = helpTextShowed.substring(0, helpTextShowed.length - 1)
  }
  fs.writeFileSync('public/show-help.txt', '')
}

console.clear()
console.log('\n\n\t\tBora começar?\n\n')
await inquirer.prompt([{ message }])

console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')

// Get Bids from Alertalicitacao (CNAE Numbers)
const cnaeNumbers = [986, 987, 988]
const cnaeUrl = 'https://alertalicitacao.com.br'
for (const cnaeNumber of cnaeNumbers) {
  for (let i = 0; i < 5; i++) {
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

// Remove duplicates from deletedItens
{
  const map = new Map()
  for (const item of deletedItens) {
    if (!item || !item.description) continue
    if (!map.has(item.description)) {
      map.set(item.description, item)
    }
  }
  deletedItens = Array.from(map.values())
}
{
  const map = new Map()
  for (const item of allItens) {
    if (!item || !item.description || !item.links) continue
    const key = `${item.description}||${item.links}`
    if (!map.has(key)) {
      map.set(key, item)
    }
  }
  allItens = Array.from(map.values())
}

// Get Bids from Pocos de Caldas (Editais)
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

for (let i = 0; i < 10; i++) {
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
  params.append('formFiles:tabela_first', i * 10);

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

// Add read later items to allItens if they are not already in allItens
for (const { description, links } of readLaterItens) {
  if (!allItens.some(e => e.description === description)) {
    allItens.push({ description, links })
  }
}

// Ask user if they want to delete or read later
for (const { description, links } of allItens) {
  if (deletedItens.some(e => e.description === description)) {
    continue
  }

  let matchedKey = null
  for (const key of KEYS_TO_INCLUDE) {
    if (
      description.toLowerCase().includes(key.toLowerCase()) &&
      !KEYS_TO_EXCLUDE.some(e => description.toLowerCase().includes(e.toLowerCase()))
    ) {
      matchedKey = key
      break
    }
  }

  if (!matchedKey) continue

  const hasReadLater = readLaterItens.some(e => e.description === description)
  console.clear()
  console.log(`[TIPO] ${hasReadLater ? 'Ler mais tarde' : 'Novo'}\n`)
  console.log(`[PALAVRA-CHAVE] ${matchedKey.toUpperCase()}\n`)
  console.log(`[DESCRIÇÃO]\n\n\t${description}\n`)
  console.log(`[LINKS]\n\t${links.split(', ').join('\n\t')}\n`)
  const userRes = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Descartar este item? [Y = Descartar, N = Ler mais tarde] (default: Y)'
    }
  ])

  if (userRes.confirm) {
    deletedItens.push({ description, links })

    const map = new Map()
    for (const item of deletedItens) {
      if (!item || !item.description) continue
      if (!map.has(item.description)) {
        map.set(item.description, item)
      }
    }
    deletedItens = Array.from(map.values())

    readLaterItens = readLaterItens.filter(e => e.description !== description)
    fs.writeFileSync('public/read-later.json', JSON.stringify(readLaterItens, null, 2))
    fs.writeFileSync('public/deleted.json', JSON.stringify(deletedItens, null, 2))
  } else if (!hasReadLater) {
    readLaterItens.push({ description, links })
    fs.writeFileSync('public/read-later.json', JSON.stringify(readLaterItens, null, 2))
  }
}

console.clear()
console.log('\n\n\t\tNenhum outro edital encontrado, Finalizando...\n\n')