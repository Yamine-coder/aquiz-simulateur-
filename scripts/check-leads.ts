import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  const leads = await p.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  console.log(JSON.stringify(leads, null, 2))
  await p.$disconnect()
}

main()
