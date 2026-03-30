import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password.utils';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  buildPagination,
  parsePagination,
} from '../utils/response.utils';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organisation name must be at least 2 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must not exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  plan: z.enum(['starter', 'growth', 'business', 'enterprise']).optional().default('starter'),
  timezone: z.string().optional().default('Asia/Kolkata'),
  brand_colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional(),
  adminEmail: z.string().email('Invalid admin email'),
  adminName: z.string().min(2, 'Admin name must be at least 2 characters'),
  adminPhone: z.string().optional(),
  adminPassword: z.string().min(8, 'Admin password must be at least 8 characters').optional(),
});

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  logo_url: z.string().url('Invalid URL').optional(),
  brand_colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  timezone: z.string().optional(),
  plan: z.enum(['starter', 'growth', 'business', 'enterprise']).optional(),
  status: z.enum(['active', 'suspended', 'trial']).optional(),
  subscription_id: z.string().optional(),
});

export async function listOrganisations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [organisations, total] = await Promise.all([
      prisma.organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: { users: true },
          },
        },
      }),
      prisma.organisation.count({ where }),
    ]);

    const orgsWithStats = organisations.map((org) => ({
      ...org,
      employee_count: org._count.users,
      _count: undefined,
    }));

    sendSuccess(
      res,
      orgsWithStats,
      'Organisations fetched successfully',
      200,
      buildPagination(page, limit, total)
    );
  } catch (error) {
    next(error);
  }
}

export async function createOrganisation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = createOrgSchema.parse(req.body);

    // Check if slug already exists
    const existingOrg = await prisma.organisation.findUnique({
      where: { slug: data.slug },
    });

    if (existingOrg) {
      sendConflict(res, `Organisation with slug '${data.slug}' already exists`);
      return;
    }

    // Check if admin email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.adminEmail.toLowerCase() },
    });

    if (existingUser) {
      sendConflict(res, `User with email '${data.adminEmail}' already exists`);
      return;
    }

    const adminPassword = data.adminPassword || `${data.slug.charAt(0).toUpperCase()}${data.slug.slice(1)}@2026`;
    const passwordHash = await hashPassword(adminPassword);

    // Split adminName into first_name and last_name
    const nameParts = data.adminName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || nameParts[0];

    // Create org and admin in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: data.name,
          slug: data.slug,
          plan: data.plan,
          timezone: data.timezone,
          brand_colour: data.brand_colour,
          status: 'trial',
        },
      });

      const admin = await tx.user.create({
        data: {
          org_id: org.id,
          email: data.adminEmail.toLowerCase(),
          phone: data.adminPhone,
          password_hash: passwordHash,
          role: 'org_admin',
          first_name: firstName,
          last_name: lastName,
          status: 'active',
          employee_id: 'ADM001',
        },
      });

      return { org, admin };
    });

    sendCreated(res, {
      organisation: result.org,
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        name: `${result.admin.first_name} ${result.admin.last_name}`,
        role: result.admin.role,
        ...(data.adminPassword ? {} : { generatedPassword: adminPassword }),
      },
    }, 'Organisation created successfully');
  } catch (error) {
    next(error);
  }
}

export async function getOrganisation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;

    const org = await prisma.organisation.findUnique({
      where: { id },
      include: {
        _count: {
          select: { users: true, attendance: true },
        },
        users: {
          where: { role: 'org_admin' },
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
          },
        },
      },
    });

    if (!org) {
      sendNotFound(res, 'Organisation not found');
      return;
    }

    sendSuccess(res, {
      ...org,
      employee_count: org._count.users,
      total_attendance_records: org._count.attendance,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrganisation(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateOrgSchema.parse(req.body);

    const existing = await prisma.organisation.findUnique({ where: { id } });
    if (!existing) {
      sendNotFound(res, 'Organisation not found');
      return;
    }

    const updated = await prisma.organisation.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.logo_url !== undefined && { logo_url: data.logo_url }),
        ...(data.brand_colour !== undefined && { brand_colour: data.brand_colour }),
        ...(data.timezone && { timezone: data.timezone }),
        ...(data.plan && { plan: data.plan }),
        ...(data.status && { status: data.status }),
        ...(data.subscription_id !== undefined && { subscription_id: data.subscription_id }),
      },
    });

    sendSuccess(res, updated, 'Organisation updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function getDashboard(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const [
      totalOrgs,
      activeOrgs,
      trialOrgs,
      suspendedOrgs,
      totalEmployees,
      totalAdmins,
      orgsByPlan,
      recentOrgs,
      todayAttendance,
    ] = await Promise.all([
      prisma.organisation.count(),
      prisma.organisation.count({ where: { status: 'active' } }),
      prisma.organisation.count({ where: { status: 'trial' } }),
      prisma.organisation.count({ where: { status: 'suspended' } }),
      prisma.user.count({ where: { role: 'employee' } }),
      prisma.user.count({ where: { role: 'org_admin' } }),
      prisma.organisation.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),
      prisma.organisation.findMany({
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          status: true,
          created_at: true,
          _count: { select: { users: true } },
        },
      }),
      prisma.attendance.count({
        where: {
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    const planBreakdown = orgsByPlan.reduce(
      (acc: Record<string, number>, item) => {
        acc[item.plan] = item._count.id;
        return acc;
      },
      {}
    );

    sendSuccess(res, {
      summary: {
        total_organisations: totalOrgs,
        active_organisations: activeOrgs,
        trial_organisations: trialOrgs,
        suspended_organisations: suspendedOrgs,
        total_employees: totalEmployees,
        total_admins: totalAdmins,
        today_attendance: todayAttendance,
      },
      plan_breakdown: planBreakdown,
      recent_organisations: recentOrgs.map((org) => ({
        ...org,
        employee_count: org._count.users,
        _count: undefined,
      })),
    });
  } catch (error) {
    next(error);
  }
}
