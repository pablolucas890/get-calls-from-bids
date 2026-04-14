import { GoogleGenAI } from "@google/genai"

export async function itsWorthIt(title: string, model: string, timeoutToWait: number, DEFAULT_TIMEOUT_TO_WAIT: number, EDITAL_ANALYSIS_PROMPT: string, ai: GoogleGenAI) {
  const beforeAiTimeout = timeoutToWait
  const response = await ai.models.generateContent({
    model: model,
    contents: EDITAL_ANALYSIS_PROMPT.replace('{{COLE AQUI O TÍTULO}}', title),
  })
  const afterAiTimeout = timeoutToWait
  const difference = afterAiTimeout - beforeAiTimeout
  if (difference < DEFAULT_TIMEOUT_TO_WAIT) {
    await new Promise(resolve => setTimeout(resolve, (DEFAULT_TIMEOUT_TO_WAIT - difference) * 1000))
  }
  const aiText = (response.text ?? '').trim().toUpperCase()
  return aiText
}
