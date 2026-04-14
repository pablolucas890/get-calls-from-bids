import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
import fs from 'fs';
import { DEFAULT_TIMEOUT_TO_WAIT, EDITAL_ANALYSIS_PROMPT, KEYS_TO_EXCLUDE, KEYS_TO_INCLUDE, MESSAGE, MODELS, SHOW_HELP } from "./global/constants";
import { Item } from "./global/props";
import { ask } from "./lib/ask";
import { decreaseTimeoutToWait } from "./lib/decreaseTimeoutToWait";
import { handleDelete } from "./lib/handleDelete";
import { itsWorthIt } from "./lib/itsWorthIt";
import { getBidsFromAlertalicitacao } from "./modules/alertaLicitacao";
import { getBidsFromGov } from "./modules/gov";
import { getBidsFromPocosDeCaldas } from "./modules/pocosDeCaldas";
import { getBidsFromPortalContasPublicas } from "./modules/portalContasPublicas";

// Variables
let justWithAi = false
let allItens: Item[] = []
let selectedModelIndex = 0
let deletedItens: Item[] = JSON.parse(fs.existsSync('public/deleted.json') ? fs.readFileSync('public/deleted.json', 'utf8') || '[]' : '[]')
let readLaterItens: Item[] = JSON.parse(fs.existsSync('public/read-later.json') ? fs.readFileSync('public/read-later.json', 'utf8') || '[]' : '[]')
let timeoutToWait = 0

// Config
dotenv.config();
if (!process.env.GOOGLE_API_KEY) {
  console.error('API KEY não encontrada')
  process.exit(1)
}
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });


async function bootstrap() {
  console.clear()
  justWithAi = (await ask('Deseja analisar os editais somente via AI? [Y = Sim, N = Não] (default: Y)'))

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
}

async function main() {
  // Get Bids from modules
  await getBidsFromGov(KEYS_TO_INCLUDE, allItens)
  await getBidsFromPortalContasPublicas(KEYS_TO_INCLUDE, allItens)
  await getBidsFromAlertalicitacao(allItens)
  await getBidsFromPocosDeCaldas(allItens)

  // Remove duplicates from allItens
  {
    const map = new Map<string, Item>()
    for (const item of deletedItens) {
      if (!item || !item.description) continue
      if (!map.has(item.description)) {
        map.set(item.description, item)
      }
    }
    deletedItens = Array.from(map.values()) as Item[]
  }
  {
    const map = new Map<string, Item>()
    for (const item of allItens) {
      if (!item || !item.description || !item.links) continue
      const key = `${item.description}||${item.links}`
      if (!map.has(key)) {
        map.set(key, item)
      }
    }
    allItens = Array.from(map.values()) as Item[]
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

    let matchedKey: string | null = null
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
      let aiText: string | null = null
      try {
        aiText = await itsWorthIt(description, MODELS[selectedModelIndex], timeoutToWait, DEFAULT_TIMEOUT_TO_WAIT, EDITAL_ANALYSIS_PROMPT, ai)
      }
      catch (error) {
        selectedModelIndex = (selectedModelIndex + 1) % MODELS.length
        console.clear()
        console.log(`Erro ao analisar edital, tentando com o modelo [${MODELS[selectedModelIndex]}]`)
        await new Promise(resolve => setTimeout(resolve, 2000))
        i--
        continue
      }
      console.log(`[AI] ${aiText}\n`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (aiText && aiText.includes('NÃO VALE A PENA')) {
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

  // Finishing
  console.clear()
  console.log('\n\n\t\tNenhum outro edital encontrado, Finalizando...\n\n')
  process.exit(0)
}

decreaseTimeoutToWait(timeoutToWait)
await bootstrap()
await main()