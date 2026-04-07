import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import { XMLParser } from 'fast-xml-parser';
import fs from 'fs';
import inquirer from 'inquirer';
import { Agent, setGlobalDispatcher } from 'undici';

// Constants
const KEYS_TO_INCLUDE = fs.readFileSync('public/keys-include.txt', 'utf8').split('\n').filter(e => e.trim() !== '').map(e => e.trim())
const KEYS_TO_EXCLUDE = fs.readFileSync('public/keys-exclude.txt', 'utf8').split('\n').filter(e => e.trim() !== '').map(e => e.trim())
const MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-lite-preview-09-2025',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite'
]
const SHOW_HELP = fs.existsSync('public/show-help.txt')
const MESSAGE = 'Precione qualquer tecla para continuar...'

// Variables
let allItens = []
let selectedModelIndex = 0
let deletedItens = JSON.parse(fs.existsSync('public/deleted.json') ? fs.readFileSync('public/deleted.json', 'utf8') || '[]' : '[]')
let readLaterItens = JSON.parse(fs.existsSync('public/read-later.json') ? fs.readFileSync('public/read-later.json', 'utf8') || '[]' : '[]')

// Config
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

if (!ai.apiKey) {
  console.error('API KEY não encontrada')
  process.exit(1)
}

// Functions
async function aiSaysItsWorthIt(title, model) {
  await new Promise(resolve => setTimeout(resolve, 6000))
  const EDITAL_ANALYSIS_PROMPT = fs.readFileSync('public/it-is-worth-it-prompt.txt', 'utf8')
  const prompt = EDITAL_ANALYSIS_PROMPT.replace('{{COLE AQUI O TÍTULO}}', title)
  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
  })
  const aiText = (response.text ?? '').trim().toUpperCase()
  return aiText
}

async function ask(message, type = 'confirm') {
  return await inquirer.prompt([{ type, name: 'ask', message }]).then(res => res.ask)
}

async function handleDelete(deletedItens, readLaterItens, description, links) {
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
}

// Bootstrapping
console.clear()
const justWithAi = (await ask('Deseja analisar os editais somente via AI? [Y = Sim, N = Não] (default: N)')) || false

if (!SHOW_HELP && !justWithAi) {
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
  await ask(MESSAGE)
  console.clear()

  for (const line of helpTextToShow) {
    for (let j = 0; j < line.split(' ').length; j++) {
      const word = line.split(' ')[j]
      helpTextShowed += word + ' '
      console.clear()
      console.log(helpTextShowed)
      await new Promise(resolve => setTimeout(resolve, j === 0 ? firstWordTimeout : otherWordTimeout))
    }
    await ask(MESSAGE)
    helpTextShowed = helpTextShowed.substring(0, helpTextShowed.length - 1)
  }
  fs.writeFileSync('public/show-help.txt', '')
}

// Get Bids from Portal de contas publicas
console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')
console.log('[PORTAL DE COMPRAS PÚBLICAS]\n')
if ((await ask('Deseja buscar editais no Portal de Compras Públicas? [Y = Sim, N = Não] (default: Y)'))) {
  const portalDeContasMaxPages = (await ask('Quantas páginas deseja buscar? [default: 2]', 'input')) || 2
  const portalDeContasUrl = 'https://compras.api.portaldecompraspublicas.com.br/v2/licitacao/processos?limitePagina=12&filtroOrdenacao=3&objeto='
  for (let i = 0; i < KEYS_TO_INCLUDE.length; i++) {
    const key = KEYS_TO_INCLUDE[i]
    for (let j = 0; j < portalDeContasMaxPages; j++) {
      console.log('Buscando editais para a chave: [' + key + '] na página: ' + (j + 1))
      const portalDeContasResponse = await fetch(portalDeContasUrl + key + '&pagina=' + j).then(res => res.json())
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

// Get Bids from Alertalicitacao (CNAE Numbers)
console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')
console.log('[ALERTALICITAÇÃO]\n')
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
console.clear()
console.log('\n\n\t\tBuscando editais...\n\n')
console.log('[POCOS DE CALDAS]\n')
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
for (let i = 0; i < allItens.length; i++) {
  const { description, links } = allItens[i]

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

  if (justWithAi && !hasReadLater) {
    console.clear()
    console.log(`[DESCRIÇÃO] ${description}\n`)
    console.log(`Analisando edital com o modelo [${MODELS[selectedModelIndex]}], aguarde...`)
    let aiText = null
    try {
      aiText = await aiSaysItsWorthIt(description, MODELS[selectedModelIndex])
    }
    catch (error) {
      selectedModelIndex = (selectedModelIndex + 1) % MODELS.length
      console.clear()
      console.log(`Erro ao analisar edital, tentando com o modelo [${MODELS[selectedModelIndex]}]`)
      await new Promise(resolve => setTimeout(resolve, 6000))
      i--
      continue
    }
    console.log(`[AI] ${aiText}\n`)
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (aiText.includes('NÃO VALE A PENA')) {
      await handleDelete(deletedItens, readLaterItens, description, links)
      continue
    }
  }

  console.clear()
  console.log(`[TIPO] ${hasReadLater ? 'Ler mais tarde' : 'Novo'}\n`)
  console.log(`[PALAVRA-CHAVE] ${matchedKey.toUpperCase()}\n`)
  console.log(`[DESCRIÇÃO]\n\n\t${description}\n`)
  console.log(`[LINKS]\n\t${links.split(', ').join('\n\t')}\n`)
  const userRes = await ask('Descartar este item? [Y = Descartar, N = Ler mais tarde] (default: Y)')

  if (userRes) {
    await handleDelete(deletedItens, readLaterItens, description, links)
  } else if (!hasReadLater) {
    readLaterItens.push({ description, links })
    fs.writeFileSync('public/read-later.json', JSON.stringify(readLaterItens, null, 2))
  }
}

console.clear()
console.log('\n\n\t\tNenhum outro edital encontrado, Finalizando...\n\n')
