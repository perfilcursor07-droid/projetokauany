import { prisma } from './prisma.js';

// Resolve o negocio das rotas publicas. Hoje ha 1 negocio (o da esposa);
// quando virar SaaS, basta exigir o slug na URL.
export async function resolvePublicBusiness(slug?: string) {
  if (slug) {
    return prisma.business.findFirst({ where: { slug, active: true } });
  }
  return prisma.business.findFirst({ where: { active: true }, orderBy: { id: 'asc' } });
}
