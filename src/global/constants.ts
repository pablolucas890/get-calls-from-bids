import fs from 'fs'

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
const KEYS_TO_INCLUDE = fs.readFileSync('public/keys-include.txt', 'utf8').split('\n').filter(e => e.trim() !== '').map(e => e.trim())
const KEYS_TO_EXCLUDE = fs.readFileSync('public/keys-exclude.txt', 'utf8').split('\n').filter(e => e.trim() !== '').map(e => e.trim())
const SHOW_HELP = fs.existsSync('public/show-help.txt')
const MESSAGE = 'Precione qualquer tecla para continuar...'
const DEFAULT_TIMEOUT_TO_WAIT = 6
const EDITAL_ANALYSIS_PROMPT = fs.readFileSync('public/it-is-worth-it-prompt.txt', 'utf8')

export { DEFAULT_TIMEOUT_TO_WAIT, EDITAL_ANALYSIS_PROMPT, KEYS_TO_EXCLUDE, KEYS_TO_INCLUDE, MESSAGE, MODELS, SHOW_HELP }
