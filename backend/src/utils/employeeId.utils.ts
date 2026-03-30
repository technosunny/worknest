import prisma from '../lib/prisma';

/**
 * Generate employee ID like EPI001, EPI002, etc.
 * Prefix is derived from org slug (first 3 uppercase letters)
 * Counter is per-org, padded to 3 digits (then 4, 5 as needed)
 */
export async function generateEmployeeId(orgId: string): Promise<string> {
  // Get org slug to derive prefix
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });

  if (!org) {
    throw new Error('Organisation not found');
  }

  // Derive prefix from slug: take first 3 alphanum chars, uppercase
  const slugClean = org.slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = slugClean.substring(0, 3) || 'EMP';

  // Count existing employees in this org to get next number
  const count = await prisma.user.count({
    where: {
      org_id: orgId,
      role: { not: 'super_admin' },
      employee_id: { not: null },
    },
  });

  const nextNumber = count + 1;
  const padded = String(nextNumber).padStart(3, '0');

  return `${prefix}${padded}`;
}

/**
 * Ensure uniqueness - if the generated ID is already taken, increment
 */
export async function generateUniqueEmployeeId(orgId: string): Promise<string> {
  const org = await prisma.organisation.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });

  if (!org) {
    throw new Error('Organisation not found');
  }

  const slugClean = org.slug.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const prefix = slugClean.substring(0, 3) || 'EMP';

  // Find the highest numbered employee_id for this org with this prefix
  const employees = await prisma.user.findMany({
    where: {
      org_id: orgId,
      employee_id: {
        startsWith: prefix,
        not: null,
      },
    },
    select: { employee_id: true },
    orderBy: { created_at: 'desc' },
  });

  let maxNum = 0;
  for (const emp of employees) {
    if (emp.employee_id) {
      const numPart = emp.employee_id.replace(prefix, '');
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNumber = maxNum + 1;
  const padded = String(nextNumber).padStart(3, '0');
  const candidateId = `${prefix}${padded}`;

  // Verify uniqueness
  const existing = await prisma.user.findFirst({
    where: { org_id: orgId, employee_id: candidateId },
  });

  if (existing) {
    // Retry with +1
    const retryNum = nextNumber + 1;
    const retryPadded = String(retryNum).padStart(3, '0');
    return `${prefix}${retryPadded}`;
  }

  return candidateId;
}
