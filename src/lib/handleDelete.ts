import fs from 'fs'
import { Item } from '../global/props'

export async function handleDelete(deletedItens: Item[], readLaterItens: Item[], description: string, links: string) {
  deletedItens.push({ description, links })

  const map = new Map<string, Item>()
  for (const item of deletedItens) {
    if (!item || !item.description) continue
    if (!map.has(item.description)) {
      map.set(item.description, item)
    }
  }
  deletedItens = Array.from(map.values()) as Item[]

  readLaterItens = readLaterItens.filter(e => e.description !== description) as Item[]
  fs.writeFileSync('public/read-later.json', JSON.stringify(readLaterItens, null, 2))
  fs.writeFileSync('public/deleted.json', JSON.stringify(deletedItens, null, 2))
}