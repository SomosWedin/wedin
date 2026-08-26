;(async () => {
  const { PrismaClient } = require('@prisma/client')
  const { CATEGORIES } = require('../prisma/categories')

  const usage = `Usage: yarn redefine-categories [--apply]

Redefines the gift catalog taxonomy: backfills the new Category fields onto
existing documents, creates the event-type-aware categories, and moves the
gifts whose new home is unambiguous.

Run immediately after \`prisma db push\` — until the backfill lands, reading a
Category through Prisma throws on documents missing \`sortOrder\`.

Dry run by default — pass --apply to write. Never deletes a category.`

  if (process.argv.includes('--help')) {
    console.log(usage)
    return
  }

  const legacyMapping: Record<string, string> = {
    Viajes: 'Luna de miel',
    Aventura: 'Luna de miel',
    Relax: 'Luna de miel',
    Gastronomía: 'Luna de miel',
    'Cultura y arte': 'Luna de miel',
    Electrodomésticos: 'Cama y cocina',
  }

  const needsManualReview = ['Casa']

  const client = new PrismaClient()
  const apply = process.argv.includes('--apply')

  try {
    console.log(
      apply ? '=== APPLY ===' : '=== DRY RUN (pass --apply to write) ==='
    )

    const stale = { sortOrder: { $exists: false } }
    const counted = await client.$runCommandRaw({
      count: 'Category',
      query: stale,
    })
    console.log(
      `\n--- backfill ---\n${counted.n} categories missing the new fields`
    )

    if (apply && Number(counted.n) > 0) {
      await client.$runCommandRaw({
        update: 'Category',
        updates: [
          {
            q: stale,
            u: { $set: { eventTypes: ['WEDDING', 'OTHER'], sortOrder: 100 } },
            multi: true,
          },
        ],
      })
    }

    console.log('\n--- categories ---')

    const existingNames = new Set(
      (
        (await client.$runCommandRaw({
          find: 'Category',
          filter: {},
          projection: { name: 1 },
        })) as { cursor: { firstBatch: { name: string }[] } }
      ).cursor.firstBatch.map(doc => doc.name)
    )

    for (const { name, eventTypes, sortOrder } of CATEGORIES) {
      console.log(
        `${existingNames.has(name) ? '~' : '+'} ${name}: eventTypes=${eventTypes.join(
          '|'
        )} sortOrder=${sortOrder}`
      )
      if (apply) {
        await client.category.upsert({
          where: { name },
          update: { eventTypes, sortOrder },
          create: { name, eventTypes, sortOrder },
        })
      }
    }

    if (!apply) {
      console.log(
        '\nStopping here: the retag and leftover report need the backfill applied first.'
      )
      return
    }

    const newNames = new Set(CATEGORIES.map((c: { name: string }) => c.name))
    const legacy = (await client.category.findMany()).filter(
      (c: { name: string }) => !newNames.has(c.name)
    )

    console.log('\n--- retag ---')

    for (const [from, to] of Object.entries(legacyMapping)) {
      const source = await client.category.findUnique({ where: { name: from } })
      const target = await client.category.findUnique({ where: { name: to } })

      if (!source) continue
      if (!target) {
        console.log(`! ${from} -> ${to}: target missing, skipped`)
        continue
      }

      const gifts = await client.gift.count({
        where: { categoryId: source.id },
      })
      const giftlists = await client.giftlist.count({
        where: { categoryId: source.id },
      })
      console.log(`> ${from} -> ${to}: ${gifts} gifts, ${giftlists} giftlists`)

      await client.gift.updateMany({
        where: { categoryId: source.id },
        data: { categoryId: target.id },
      })
      await client.giftlist.updateMany({
        where: { categoryId: source.id },
        data: { categoryId: target.id },
      })
    }

    console.log('\n--- manual review ---')

    for (const name of needsManualReview) {
      const category = await client.category.findUnique({ where: { name } })
      if (!category) continue
      const gifts = await client.gift.count({
        where: { categoryId: category.id },
      })
      console.log(
        `? ${name}: ${gifts} gifts, splits several ways — retag by hand`
      )
    }

    console.log('\n--- leftovers ---')

    for (const category of legacy) {
      const gifts = await client.gift.count({
        where: { categoryId: category.id },
      })
      const giftlists = await client.giftlist.count({
        where: { categoryId: category.id },
      })
      console.log(
        gifts + giftlists === 0
          ? `. ${category.name}: unreferenced, safe to delete by hand`
          : `. ${category.name}: still holds ${gifts} gifts / ${giftlists} giftlists`
      )
    }
  } finally {
    await client.$disconnect()
  }
})().catch((error: Error) => {
  console.error(error.message)
  process.exit(1)
})
