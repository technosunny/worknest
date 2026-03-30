import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { parse } from 'csv-parse';
import fs from 'fs';
import prisma from '../lib/prisma';
import { hashPassword } from '../utils/password.utils';
import { generateUniqueEmployeeId } from '../utils/employeeId.utils';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  buildPagination,
  parsePagination,
} from '../utils/response.utils';

const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  reporting_manager_id: z.string().uuid('Invalid manager ID').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

const updateEmployeeSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  reporting_manager_id: z.string().uuid('Invalid manager ID').nullable().optional(),
  status: z.enum(['active', 'inactive', 'exited']).optional(),
  avatar_url: z.string().url('Invalid URL').optional(),
});

export async function listEmployees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const search = req.query.search as string | undefined;
    const department = req.query.department as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {
      org_id: orgId,
      role: { not: 'super_admin' },
    };

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employee_id: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) {
      where.department = { equals: department, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    const [employees, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          first_name: true,
          last_name: true,
          employee_id: true,
          designation: true,
          department: true,
          shift: true,
          status: true,
          avatar_url: true,
          created_at: true,
          reporting_manager: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              employee_id: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(
      res,
      employees,
      'Employees fetched successfully',
      200,
      buildPagination(page, limit, total)
    );
  } catch (error) {
    next(error);
  }
}

export async function createEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const data = createEmployeeSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      sendConflict(res, `User with email '${data.email}' already exists`);
      return;
    }

    // Validate reporting manager belongs to same org
    if (data.reporting_manager_id) {
      const manager = await prisma.user.findFirst({
        where: { id: data.reporting_manager_id, org_id: orgId },
      });
      if (!manager) {
        sendBadRequest(res, 'Reporting manager not found in this organisation');
        return;
      }
    }

    const employeeId = await generateUniqueEmployeeId(orgId);
    const password = data.password || `Welcome@${new Date().getFullYear()}`;
    const passwordHash = await hashPassword(password);

    const employee = await prisma.user.create({
      data: {
        org_id: orgId,
        email: data.email.toLowerCase(),
        phone: data.phone,
        password_hash: passwordHash,
        role: 'employee',
        first_name: data.first_name,
        last_name: data.last_name,
        employee_id: employeeId,
        designation: data.designation,
        department: data.department,
        shift: data.shift,
        reporting_manager_id: data.reporting_manager_id,
        status: 'active',
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        first_name: true,
        last_name: true,
        employee_id: true,
        designation: true,
        department: true,
        shift: true,
        status: true,
        avatar_url: true,
        created_at: true,
      },
    });

    sendCreated(res, {
      employee,
      ...(data.password ? {} : { generatedPassword: password }),
    }, 'Employee created successfully');
  } catch (error) {
    next(error);
  }
}

export async function getEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const { id } = req.params;

    const employee = await prisma.user.findFirst({
      where: { id, org_id: orgId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        first_name: true,
        last_name: true,
        employee_id: true,
        designation: true,
        department: true,
        shift: true,
        status: true,
        avatar_url: true,
        created_at: true,
        updated_at: true,
        reporting_manager: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            employee_id: true,
            designation: true,
          },
        },
        direct_reports: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            employee_id: true,
            designation: true,
          },
        },
        attendance: {
          take: 10,
          orderBy: { date: 'desc' },
          select: {
            id: true,
            date: true,
            status: true,
            check_in_time: true,
            check_out_time: true,
            total_hours: true,
          },
        },
      },
    });

    if (!employee) {
      sendNotFound(res, 'Employee not found');
      return;
    }

    sendSuccess(res, employee);
  } catch (error) {
    next(error);
  }
}

export async function updateEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const { id } = req.params;
    const data = updateEmployeeSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id, org_id: orgId },
    });

    if (!existing) {
      sendNotFound(res, 'Employee not found');
      return;
    }

    // Check email uniqueness if changing email
    if (data.email && data.email.toLowerCase() !== existing.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });
      if (emailExists) {
        sendConflict(res, `Email '${data.email}' is already in use`);
        return;
      }
    }

    // Validate reporting manager
    if (data.reporting_manager_id) {
      if (data.reporting_manager_id === id) {
        sendBadRequest(res, 'Employee cannot be their own reporting manager');
        return;
      }
      const manager = await prisma.user.findFirst({
        where: { id: data.reporting_manager_id, org_id: orgId },
      });
      if (!manager) {
        sendBadRequest(res, 'Reporting manager not found in this organisation');
        return;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.email && { email: data.email.toLowerCase() }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.first_name && { first_name: data.first_name }),
        ...(data.last_name && { last_name: data.last_name }),
        ...(data.designation !== undefined && { designation: data.designation }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.shift !== undefined && { shift: data.shift }),
        ...(data.reporting_manager_id !== undefined && {
          reporting_manager_id: data.reporting_manager_id,
        }),
        ...(data.status && { status: data.status }),
        ...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        first_name: true,
        last_name: true,
        employee_id: true,
        designation: true,
        department: true,
        shift: true,
        status: true,
        avatar_url: true,
        updated_at: true,
      },
    });

    sendSuccess(res, updated, 'Employee updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function deactivateEmployee(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const { id } = req.params;

    // Prevent self-deactivation
    if (id === req.user!.userId) {
      sendBadRequest(res, 'You cannot deactivate your own account');
      return;
    }

    const existing = await prisma.user.findFirst({
      where: { id, org_id: orgId },
    });

    if (!existing) {
      sendNotFound(res, 'Employee not found');
      return;
    }

    if (existing.status === 'inactive') {
      sendBadRequest(res, 'Employee is already inactive');
      return;
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'inactive' },
    });

    sendSuccess(res, null, 'Employee deactivated successfully');
  } catch (error) {
    next(error);
  }
}

interface CsvRow {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  designation?: string;
  department?: string;
  shift?: string;
}

export async function bulkImportEmployees(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;

    if (!req.file) {
      sendBadRequest(res, 'CSV file is required');
      return;
    }

    const filePath = req.file.path;

    // Parse CSV
    const records: CsvRow[] = await new Promise((resolve, reject) => {
      const results: CsvRow[] = [];
      fs.createReadStream(filePath)
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
          })
        )
        .on('data', (row: CsvRow) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlink(filePath, () => {});

    if (records.length === 0) {
      sendBadRequest(res, 'CSV file is empty');
      return;
    }

    if (records.length > 500) {
      sendBadRequest(res, 'Cannot import more than 500 employees at once');
      return;
    }

    const rowSchema = z.object({
      email: z.string().email('Invalid email'),
      first_name: z.string().min(1, 'First name required'),
      last_name: z.string().min(1, 'Last name required'),
      phone: z.string().optional(),
      designation: z.string().optional(),
      department: z.string().optional(),
      shift: z.string().optional(),
    });

    const validRows: CsvRow[] = [];
    const errors: { row: number; errors: string[] }[] = [];

    for (let i = 0; i < records.length; i++) {
      const result = rowSchema.safeParse(records[i]);
      if (!result.success) {
        errors.push({
          row: i + 2, // +2 for header + 1-based
          errors: result.error.errors.map((e) => e.message),
        });
      } else {
        validRows.push(result.data);
      }
    }

    if (errors.length > 0) {
      sendBadRequest(res, 'CSV validation errors', JSON.stringify(errors));
      return;
    }

    // Check for duplicate emails in CSV
    const emails = validRows.map((r) => r.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      sendBadRequest(res, 'CSV contains duplicate email addresses');
      return;
    }

    // Check which emails already exist in DB
    const existingUsers = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true },
    });

    const existingEmails = new Set(existingUsers.map((u) => u.email));
    const duplicateEmails = emails.filter((e) => existingEmails.has(e));

    if (duplicateEmails.length > 0) {
      sendConflict(res, `The following emails already exist: ${duplicateEmails.join(', ')}`);
      return;
    }

    // Create all employees in a transaction
    const defaultPassword = `Welcome@${new Date().getFullYear()}`;
    const passwordHash = await hashPassword(defaultPassword);

    const created = await prisma.$transaction(async (tx) => {
      const createdEmployees = [];
      for (const row of validRows) {
        const employeeId = await generateUniqueEmployeeId(orgId);

        const employee = await tx.user.create({
          data: {
            org_id: orgId,
            email: row.email.toLowerCase(),
            phone: row.phone,
            password_hash: passwordHash,
            role: 'employee',
            first_name: row.first_name,
            last_name: row.last_name,
            employee_id: employeeId,
            designation: row.designation,
            department: row.department,
            shift: row.shift,
            status: 'active',
          },
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            employee_id: true,
            department: true,
            designation: true,
          },
        });
        createdEmployees.push(employee);
      }
      return createdEmployees;
    });

    sendCreated(res, {
      imported: created.length,
      employees: created,
      defaultPassword,
    }, `Successfully imported ${created.length} employees`);
  } catch (error) {
    next(error);
  }
}

export async function getOrgDashboard(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      todayPresent,
      todayAbsent,
      monthAttendance,
      departments,
      recentEmployees,
    ] = await Promise.all([
      prisma.user.count({ where: { org_id: orgId, role: 'employee' } }),
      prisma.user.count({ where: { org_id: orgId, role: 'employee', status: 'active' } }),
      prisma.user.count({ where: { org_id: orgId, role: 'employee', status: { in: ['inactive', 'exited'] } } }),
      prisma.attendance.count({
        where: {
          org_id: orgId,
          date: { gte: today, lte: todayEnd },
          status: { in: ['present', 'half_day'] },
        },
      }),
      prisma.attendance.count({
        where: {
          org_id: orgId,
          date: { gte: today, lte: todayEnd },
          status: 'absent',
        },
      }),
      prisma.attendance.groupBy({
        by: ['status'],
        where: {
          org_id: orgId,
          date: { gte: firstDayOfMonth, lte: todayEnd },
        },
        _count: { id: true },
      }),
      prisma.user.groupBy({
        by: ['department'],
        where: { org_id: orgId, role: 'employee', status: 'active' },
        _count: { id: true },
      }),
      prisma.user.findMany({
        where: { org_id: orgId, role: 'employee' },
        take: 5,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          employee_id: true,
          designation: true,
          department: true,
          created_at: true,
        },
      }),
    ]);

    const monthStats = monthAttendance.reduce(
      (acc: Record<string, number>, item) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {}
    );

    const departmentStats = departments
      .filter((d) => d.department)
      .map((d) => ({
        department: d.department,
        count: d._count.id,
      }));

    sendSuccess(res, {
      summary: {
        total_employees: totalEmployees,
        active_employees: activeEmployees,
        inactive_employees: inactiveEmployees,
        today_present: todayPresent,
        today_absent: todayAbsent,
        today_not_checked_in: Math.max(0, activeEmployees - todayPresent - todayAbsent),
      },
      month_attendance: monthStats,
      departments: departmentStats,
      recent_employees: recentEmployees,
    });
  } catch (error) {
    next(error);
  }
}

const updateOrgSettingsSchema = z.object({
  logo_url: z.string().url('Invalid URL').optional().nullable(),
  brand_colour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
});

export async function getOrgSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;

    const org = await prisma.organisation.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
        brand_colour: true,
        timezone: true,
        plan: true,
      },
    });

    if (!org) {
      sendNotFound(res, 'Organisation not found');
      return;
    }

    sendSuccess(res, org, 'Organisation settings retrieved');
  } catch (error) {
    next(error);
  }
}

export async function updateOrgSettings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;

    const parsed = updateOrgSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      sendBadRequest(res, parsed.error.errors[0].message);
      return;
    }

    const { logo_url, brand_colour } = parsed.data;

    const updated = await prisma.organisation.update({
      where: { id: orgId },
      data: {
        ...(logo_url !== undefined && { logo_url }),
        ...(brand_colour !== undefined && { brand_colour }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
        brand_colour: true,
        timezone: true,
        plan: true,
      },
    });

    sendSuccess(res, updated, 'Organisation settings updated');
  } catch (error) {
    next(error);
  }
}
