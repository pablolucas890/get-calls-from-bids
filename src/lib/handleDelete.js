import fs from 'fs'

export async function handleDelete(deletedItens, readLaterItens, description, links) {
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