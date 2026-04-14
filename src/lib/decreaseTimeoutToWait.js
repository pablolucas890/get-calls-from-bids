export async function decreaseTimeoutToWait(timeoutToWait) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  timeoutToWait++
  decreaseTimeoutToWait()
}
