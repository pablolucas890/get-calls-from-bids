export async function decreaseTimeoutToWait(timeoutToWait: number) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  timeoutToWait++
  decreaseTimeoutToWait(timeoutToWait)
}
