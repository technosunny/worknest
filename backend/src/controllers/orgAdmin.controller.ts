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
  emp_code?: string;
  phone?: string;
  designation?: string;
  department?: string;
  shift?: string;
}

// Normalize CSV column headers to our internal field names
// Supports: "EMP CODE" / "emp_code", "Emp First Name" / "first_name", etc.
function normalizeHeaders(raw: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.trim().toLowerCase().replace(/\s+/g, '_');
    if (k.includes('email')) {
      mapped.email = value;
    } else if (k.includes('first') && k.includes('name')) {
      mapped.first_name = value;
    } else if (k.includes('last') && k.includes('name')) {
      mapped.last_name = value;
    } else if (k.includes('emp') && k.includes('code') || k === 'employee_id') {
      mapped.emp_code = value;
    } else if (k.includes('phone') || k.includes('mobile')) {
      mapped.phone = value;
    } else if (k.includes('designation') || k === 'title' || k === 'role_title') {
      mapped.designation = value;
    } else if (k.includes('department') || k === 'dept') {
      mapped.department = value;
    } else if (k === 'shift') {
      mapped.shift = value;
    }
  }
  return mapped;
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

    // Parse CSV with raw headers, then normalize
    const rawRecords: Record<string, string>[] = await new Promise((resolve, reject) => {
      const results: Record<string, string>[] = [];
      fs.createReadStream(filePath)
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true,
          })
        )
        .on('data', (row: Record<string, string>) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlink(filePath, () => {});

    // Debug: log raw headers from first row
    if (rawRecords.length > 0) {
      console.log('CSV raw headers:', Object.keys(rawRecords[0]));
      console.log('CSV first row raw:', rawRecords[0]);
    }

    const records = rawRecords.map(normalizeHeaders) as unknown as CsvRow[];

    // Debug: log normalized first row
    if (records.length > 0) {
      console.log('CSV first row normalized:', records[0]);
    }

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
      last_name: z.string().optional().default(''),
      emp_code: z.string().optional(),
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
        // Use EMP CODE from CSV if provided, otherwise auto-generate
        const employeeId = row.emp_code || await generateUniqueEmployeeId(orgId);

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

export async function listAttendance(
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

    const date = req.query.date as string | undefined;
    const employeeId = req.query.employee_id as string | undefined;
    const department = req.query.department as string | undefined;
    const status = req.query.status as string | undefined;

    const userWhere: Record<string, unknown> = { org_id: orgId };
    if (employeeId) userWhere.employee_id = { equals: employeeId, mode: 'insensitive' };
    if (department) userWhere.department = { equals: department, mode: 'insensitive' };

    const where: Record<string, unknown> = { org_id: orgId };
    if (date) {
      const d = new Date(date);
      const dEnd = new Date(date);
      dEnd.setHours(23, 59, 59, 999);
      where.date = { gte: d, lte: dEnd };
    }
    if (status) where.status = status;
    if (employeeId || department) {
      const matchingUsers = await prisma.user.findMany({
        where: userWhere,
        select: { id: true },
      });
      where.user_id = { in: matchingUsers.map((u) => u.id) };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ date: 'desc' }, { check_in_time: 'desc' }],
        include: {
          user: {
            select: {
              first_name: true,
              last_name: true,
              email: true,
              employee_id: true,
              department: true,
              designation: true,
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    sendSuccess(res, records, 'Attendance records fetched', 200, buildPagination(page, limit, total));
  } catch (error) {
    next(error);
  }
}

export async function attendanceReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
    const department = req.query.department as string | undefined;

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59, 999);

    const userWhere: Record<string, unknown> = {
      org_id: orgId,
      role: { not: 'super_admin' },
      status: 'active',
    };
    if (department) userWhere.department = { equals: department, mode: 'insensitive' };

    const employees = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        employee_id: true,
        department: true,
        designation: true,
      },
    });

    const employeeIds = employees.map((e) => e.id);

    const records = await prisma.attendance.findMany({
      where: {
        org_id: orgId,
        user_id: { in: employeeIds },
        date: { gte: startDate, lte: endDate },
      },
      select: {
        user_id: true,
        status: true,
        total_hours: true,
        check_in_time: true,
      },
    });

    const LATE_HOUR = 9;
    const LATE_MINUTE = 30;

    const summaryMap = new Map<string, {
      total_days_present: number;
      total_hours: number;
      late_count: number;
    }>();

    for (const emp of employees) {
      summaryMap.set(emp.id, { total_days_present: 0, total_hours: 0, late_count: 0 });
    }

    for (const r of records) {
      const s = summaryMap.get(r.user_id);
      if (!s) continue;
      if (r.status === 'present' || r.status === 'half_day') {
        s.total_days_present += r.status === 'present' ? 1 : 0.5;
        s.total_hours += r.total_hours ? Number(r.total_hours) : 0;
        if (r.check_in_time) {
          const h = r.check_in_time.getHours();
          const m = r.check_in_time.getMinutes();
          if (h > LATE_HOUR || (h === LATE_HOUR && m > LATE_MINUTE)) {
            s.late_count += 1;
          }
        }
      }
    }

    const report = employees.map((emp) => {
      const s = summaryMap.get(emp.id)!;
      const avg_hours = s.total_days_present > 0
        ? Math.round((s.total_hours / s.total_days_present) * 100) / 100
        : 0;
      return {
        user: emp,
        total_days_present: s.total_days_present,
        total_hours: Math.round(s.total_hours * 100) / 100,
        avg_hours,
        late_count: s.late_count,
      };
    });

    sendSuccess(res, { month, report }, 'Attendance report fetched');
  } catch (error) {
    next(error);
  }
}

export async function todayAttendance(
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

    const [employees, todayRecords] = await Promise.all([
      prisma.user.findMany({
        where: { org_id: orgId, role: { not: 'super_admin' }, status: 'active' },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
          employee_id: true,
          department: true,
          designation: true,
        },
      }),
      prisma.attendance.findMany({
        where: { org_id: orgId, date: { gte: today, lte: todayEnd } },
        select: {
          id: true,
          user_id: true,
          check_in_time: true,
          check_out_time: true,
          check_in_selfie_url: true,
          total_hours: true,
          status: true,
        },
      }),
    ]);

    const recordMap = new Map(todayRecords.map((r) => [r.user_id, r]));

    const result = employees.map((emp) => {
      const rec = recordMap.get(emp.id);
      return {
        user: emp,
        attendance: rec || null,
        attendance_status: rec
          ? rec.check_out_time
            ? 'checked_out'
            : 'checked_in'
          : 'not_checked_in',
      };
    });

    const summary = {
      total: employees.length,
      checked_in: result.filter((r) => r.attendance_status === 'checked_in').length,
      checked_out: result.filter((r) => r.attendance_status === 'checked_out').length,
      not_checked_in: result.filter((r) => r.attendance_status === 'not_checked_in').length,
    };

    sendSuccess(res, { date: today.toISOString().split('T')[0], summary, records: result }, 'Today\'s attendance fetched');
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
