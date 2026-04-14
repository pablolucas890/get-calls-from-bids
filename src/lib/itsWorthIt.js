export async function itsWorthIt(title, model, timeoutToWait, DEFAULT_TIMEOUT_TO_WAIT, EDITAL_ANALYSIS_PROMPT, ai) {
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
