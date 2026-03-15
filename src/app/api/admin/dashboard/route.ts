import { checkAdminAuth } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { qualifyLead } from '@/lib/qualifyLead'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/dashboard
 * Statistiques enrichies pour le dashboard admin :
 * - KPIs globaux (contacts, rappels, leads, newsletter)
 * - Évolution sur 30 jours (leads, contacts, rappels)
 * - Leads par source
 * - Leads par niveau (hot/warm/cold)
 * - Dernières activités
 */
export async function GET(request: NextRequest) {
  const authError = await checkAdminAuth(request)
  if (authError) return authError

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart)
  weekStart.setDate(weekStart.getDate() - 7)
  const monthStart = new Date(todayStart)
  monthStart.setDate(monthStart.getDate() - 30)

  const [
    // Contacts
    totalContacts,
    contactsNouveaux,
    contactsToday,
    contactsWeek,
    contactsMonth,
    // Rappels
    totalRappels,
    rappelsNouveaux,
    rappelsToday,
    rappelsWeek,
    // Leads
    totalLeads,
    leadsToday,
    leadsWeek,
    leadsMonth,
    // Newsletter
    totalNewsletterActive,
    totalNewsletterAll,
    newsletterWeek,
    // Recent items
    recentContacts,
    recentRappels,
    recentLeads,
    // Leads by source
    allLeads,
    // All leads for timeline
    leadsTimeline,
    contactsTimeline,
    rappelsTimeline,
  ] = await Promise.all([
    // Contacts
    prisma.contact.count(),
    prisma.contact.count({ where: { status: 'nouveau' } }),
    prisma.contact.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.contact.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.contact.count({ where: { createdAt: { gte: monthStart } } }),
    // Rappels
    prisma.rappel.count(),
    prisma.rappel.count({ where: { status: 'nouveau' } }),
    prisma.rappel.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.rappel.count({ where: { createdAt: { gte: weekStart } } }),
    // Leads
    prisma.lead.count(),
    prisma.lead.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.lead.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.lead.count({ where: { createdAt: { gte: monthStart } } }),
    // Newsletter
    prisma.newsletterSubscriber.count({ where: { status: 'active' } }),
    prisma.newsletterSubscriber.count(),
    prisma.newsletterSubscriber.count({ where: { subscribedAt: { gte: weekStart } } }),
    // Recent items (5 each)
    prisma.contact.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, nom: true, email: true, status: true, createdAt: true } }),
    prisma.rappel.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, prenom: true, telephone: true, status: true, budget: true, createdAt: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, email: true, prenom: true, source: true, contexte: true, createdAt: true } }),
    // All leads for source breakdown
    prisma.lead.findMany({ select: { id: true, source: true, contexte: true } }),
    // Timeline data (30 days)
    prisma.lead.findMany({ where: { createdAt: { gte: monthStart } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.contact.findMany({ where: { createdAt: { gte: monthStart } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
    prisma.rappel.findMany({ where: { createdAt: { gte: monthStart } }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
  ])

  // ── Leads by source ──
  const leadsBySource: Record<string, number> = {}
  for (const lead of allLeads) {
    leadsBySource[lead.source] = (leadsBySource[lead.source] ?? 0) + 1
  }

  // ── Leads by niveau (hot/warm/cold) — requalifie à la volée si manquant ──
  const leadsByNiveau: Record<string, number> = { hot: 0, warm: 0, cold: 0 }
  const leadsToUpdate: Array<{ id: string; contexte: string }> = []
  for (const lead of allLeads) {
    let ctx: Record<string, unknown> | undefined
    if (lead.contexte) {
      try { ctx = JSON.parse(lead.contexte) as Record<string, unknown> } catch { /* ignore */ }
    }
    const existingNiveau = ctx?.niveau as string | undefined
    if (existingNiveau && ['hot', 'warm', 'cold'].includes(existingNiveau)) {
      leadsByNiveau[existingNiveau] = (leadsByNiveau[existingNiveau] ?? 0) + 1
    } else {
      // Re-qualify on the fly
      const { score, niveau } = qualifyLead(lead.source, ctx)
      leadsByNiveau[niveau] = (leadsByNiveau[niveau] ?? 0) + 1
      const enriched = { ...ctx, score, niveau }
      leadsToUpdate.push({ id: lead.id, contexte: JSON.stringify(enriched) })
    }
  }
  // Persist re-qualifications in background (fire-and-forget)
  if (leadsToUpdate.length > 0) {
    Promise.allSettled(
      leadsToUpdate.map(u => prisma.lead.update({ where: { id: u.id }, data: { contexte: u.contexte } }))
    ).catch(() => { /* silent */ })
  }

  // ── 30-day timeline ──
  const timeline: Array<{ date: string; leads: number; contacts: number; rappels: number }> = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const nextD = new Date(d)
    nextD.setDate(nextD.getDate() + 1)

    timeline.push({
      date: dateStr,
      leads: leadsTimeline.filter((l) => {
        const t = new Date(l.createdAt).getTime()
        return t >= d.getTime() && t < nextD.getTime()
      }).length,
      contacts: contactsTimeline.filter((c) => {
        const t = new Date(c.createdAt).getTime()
        return t >= d.getTime() && t < nextD.getTime()
      }).length,
      rappels: rappelsTimeline.filter((r) => {
        const t = new Date(r.createdAt).getTime()
        return t >= d.getTime() && t < nextD.getTime()
      }).length,
    })
  }

  // ── Analytics events (tool usage) ──
  const prevWeekStart = new Date(weekStart)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)

  const [
    analyticsAll,
    analyticsWeek,
    analyticsPrevWeek,
    analyticsMonth,
  ] = await Promise.all([
    prisma.analyticsEvent.groupBy({ by: ['event'], _count: { id: true } }),
    prisma.analyticsEvent.groupBy({ by: ['event'], where: { createdAt: { gte: weekStart } }, _count: { id: true } }),
    prisma.analyticsEvent.groupBy({ by: ['event'], where: { createdAt: { gte: prevWeekStart, lt: weekStart } }, _count: { id: true } }),
    prisma.analyticsEvent.findMany({ where: { createdAt: { gte: monthStart } }, select: { event: true, data: true, createdAt: true } }),
  ])

  // Tool usage totals
  const toolUsage: Record<string, number> = {}
  for (const e of analyticsAll) toolUsage[e.event] = e._count.id
  const toolUsageWeek: Record<string, number> = {}
  for (const e of analyticsWeek) toolUsageWeek[e.event] = e._count.id
  const toolUsagePrevWeek: Record<string, number> = {}
  for (const e of analyticsPrevWeek) toolUsagePrevWeek[e.event] = e._count.id

  // Total simulations
  const totalSimulations = (toolUsage['simulation-a'] ?? 0) + (toolUsage['simulation-b'] ?? 0)
  const simulationsWeek = (toolUsageWeek['simulation-a'] ?? 0) + (toolUsageWeek['simulation-b'] ?? 0)
  const simulationsPrevWeek = (toolUsagePrevWeek['simulation-a'] ?? 0) + (toolUsagePrevWeek['simulation-b'] ?? 0)

  // Growth rates (week over week %)
  const growthRate = (current: number, previous: number) =>
    previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100)

  // Previous week counts for leads
  const leadsPrevWeek = await prisma.lead.count({
    where: { createdAt: { gte: prevWeekStart, lt: weekStart } },
  })

  // Conversion rates
  // sim→lead: only count leads from simulators (not comparateur/carte/aides)
  const simulatorLeads = await prisma.lead.count({
    where: { source: { in: ['simulateur-a', 'simulateur-b'] } },
  })
  const conversionSimToLead = totalSimulations > 0
    ? Math.min(Math.round((simulatorLeads / totalSimulations) * 100), 100)
    : 0
  const conversionLeadToContact = totalLeads > 0
    ? Math.min(Math.round((totalContacts / totalLeads) * 100), 100)
    : 0

  // Aggregated analytics data (from event data JSON)
  let totalBudgetSum = 0
  let budgetCount = 0
  let totalTauxSum = 0
  let tauxCount = 0
  let totalDureeSum = 0
  let dureeCount = 0
  let totalApportSum = 0
  let apportCount = 0
  const typeBienHits: Record<string, number> = {}
  const communeHits: Record<string, number> = {}

  for (const evt of analyticsMonth) {
    try {
      const d = JSON.parse(evt.data) as Record<string, unknown>
      if (evt.event === 'simulation-a' || evt.event === 'simulation-b') {
        if (typeof d.budgetMax === 'number') { totalBudgetSum += d.budgetMax; budgetCount++ }
        if (typeof d.tauxEndettement === 'number') { totalTauxSum += d.tauxEndettement; tauxCount++ }
        if (typeof d.dureeAns === 'number') { totalDureeSum += d.dureeAns; dureeCount++ }
        if (typeof d.apport === 'number') { totalApportSum += d.apport; apportCount++ }
        if (typeof d.typeBien === 'string' && d.typeBien) {
          typeBienHits[d.typeBien] = (typeBienHits[d.typeBien] ?? 0) + 1
        }
      }
      if (evt.event === 'carte-view' && typeof d.commune === 'string') {
        communeHits[d.commune] = (communeHits[d.commune] ?? 0) + 1
      }
    } catch { /* skip malformed */ }
  }

  const topCommunes = Object.entries(communeHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([commune, count]) => ({ commune, count }))

  // ── Funnel data (starts → steps → completions → PDF) ──
  const funnelSteps: Record<string, Record<string, number>> = { a: {}, b: {} }

  for (const evt of analyticsMonth) {
    try {
      const d = JSON.parse(evt.data) as Record<string, unknown>
      if (evt.event === 'simulation-a-step' || evt.event === 'simulation-b-step') {
        const mode = evt.event === 'simulation-a-step' ? 'a' : 'b'
        const from = String(d.from ?? '')
        const to = String(d.to ?? '')
        const key = `${from}→${to}`
        funnelSteps[mode][key] = (funnelSteps[mode][key] ?? 0) + 1
      }
    } catch { /* skip malformed */ }
  }

  // Count PDF downloads from ALL events (not just month) — field is "source" not "mode"
  const allPdfEvents = await prisma.analyticsEvent.findMany({
    where: { event: 'pdf-download' },
    select: { data: true },
  })
  let pdfDownloadsA = 0
  let pdfDownloadsB = 0
  for (const evt of allPdfEvents) {
    try {
      const d = JSON.parse(evt.data) as Record<string, unknown>
      const mode = d.mode ?? d.source // tracking sends "source", accept both
      if (mode === 'a' || mode === 'simulation-a') pdfDownloadsA++
      else if (mode === 'b' || mode === 'simulation-b') pdfDownloadsB++
    } catch { /* skip */ }
  }

  // Funnel counts (all-time from toolUsage)
  // Ensure starts >= completions (start tracking was added after completion tracking)
  const rawStartsA = toolUsage['simulation-a-start'] ?? 0
  const completionsA = toolUsage['simulation-a'] ?? 0
  const rawStartsB = toolUsage['simulation-b-start'] ?? 0
  const completionsB = toolUsage['simulation-b'] ?? 0
  const startsA = Math.max(rawStartsA, completionsA)
  const startsB = Math.max(rawStartsB, completionsB)

  const funnel = {
    modeA: {
      starts: startsA,
      completions: completionsA,
      pdfDownloads: pdfDownloadsA,
    },
    modeB: {
      starts: startsB,
      completions: completionsB,
      pdfDownloads: pdfDownloadsB,
    },
    steps: funnelSteps,
    totalStarts: startsA + startsB,
    totalCompletions: completionsA + completionsB,
    totalPdfDownloads: pdfDownloadsA + pdfDownloadsB,
  }

  // ── CTA click aggregation (cta-click events) ──
  const ctaByType: Record<string, number> = {}
  const ctaByPosition: Record<string, number> = {}
  const ctaByPage: Record<string, number> = {}
  const ctaWeekByType: Record<string, number> = {}
  for (const evt of analyticsMonth) {
    if (evt.event !== 'cta-click') continue
    try {
      const d = JSON.parse(evt.data) as Record<string, unknown>
      const type = String(d.type ?? 'unknown')
      const position = String(d.position ?? 'unknown')
      const page = d.page ? String(d.page) : null
      ctaByType[type] = (ctaByType[type] ?? 0) + 1
      ctaByPosition[position] = (ctaByPosition[position] ?? 0) + 1
      if (page) ctaByPage[page] = (ctaByPage[page] ?? 0) + 1
      if (new Date(evt.createdAt) >= weekStart) {
        ctaWeekByType[type] = (ctaWeekByType[type] ?? 0) + 1
      }
    } catch { /* skip */ }
  }

  return NextResponse.json({
    kpis: {
      contacts: {
        total: totalContacts,
        nouveaux: contactsNouveaux,
        today: contactsToday,
        week: contactsWeek,
        month: contactsMonth,
      },
      rappels: {
        total: totalRappels,
        nouveaux: rappelsNouveaux,
        today: rappelsToday,
        week: rappelsWeek,
      },
      leads: {
        total: totalLeads,
        today: leadsToday,
        week: leadsWeek,
        month: leadsMonth,
      },
      newsletter: {
        active: totalNewsletterActive,
        total: totalNewsletterAll,
        week: newsletterWeek,
      },
    },
    leadsBySource,
    leadsByNiveau,
    timeline,
    recent: {
      contacts: recentContacts,
      rappels: recentRappels,
      leads: recentLeads,
    },
    analytics: {
      toolUsage,
      toolUsageWeek,
      totalSimulations,
      simulationsWeek,
      simulationsModeA: toolUsage['simulation-a'] ?? 0,
      simulationsModeB: toolUsage['simulation-b'] ?? 0,
      growth: {
        simulations: growthRate(simulationsWeek, simulationsPrevWeek),
        leads: growthRate(leadsWeek, leadsPrevWeek),
      },
      conversion: {
        simToLead: conversionSimToLead,
        leadToContact: conversionLeadToContact,
      },
      averages: {
        budgetMoyen: budgetCount > 0 ? Math.round(totalBudgetSum / budgetCount) : null,
        tauxEndettementMoyen: tauxCount > 0 ? Math.round((totalTauxSum / tauxCount) * 10) / 10 : null,
        dureeMoyenne: dureeCount > 0 ? Math.round((totalDureeSum / dureeCount) * 10) / 10 : null,
        apportMoyen: apportCount > 0 ? Math.round(totalApportSum / apportCount) : null,
        typeBienTop: Object.entries(typeBienHits).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
        simCount: budgetCount,
      },
      topCommunes,
      funnel,
      cta: {
        byType: ctaByType,
        byPosition: ctaByPosition,
        byPage: ctaByPage,
        weekByType: ctaWeekByType,
        total: Object.values(ctaByType).reduce((a, b) => a + b, 0),
      },
    },
  })
}
