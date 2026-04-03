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

const employeeDetailFields = {
  father_or_guardian_name: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  current_address: z.string().optional(),
  permanent_address: z.string().optional(),
  date_of_joining: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relation: z.string().optional(),
  personal_email: z.string().optional(),
  pan_number: z.string().optional(),
  aadhaar_number: z.string().optional(),
  highest_qualification: z.string().optional(),
  uan_number: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_name: z.string().optional(),
  bank_ifsc_code: z.string().optional(),
};

const createEmployeeSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().optional().default(''),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  reporting_manager_id: z.string().uuid('Invalid manager ID').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  ...employeeDetailFields,
});

const updateEmployeeSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  shift: z.string().optional(),
  reporting_manager_id: z.string().uuid('Invalid manager ID').nullable().optional(),
  status: z.enum(['active', 'inactive', 'exited']).optional(),
  avatar_url: z.string().url('Invalid URL').optional(),
  ...employeeDetailFields,
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
        father_or_guardian_name: data.father_or_guardian_name,
        gender: data.gender,
        date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
        current_address: data.current_address,
        permanent_address: data.permanent_address,
        date_of_joining: data.date_of_joining ? new Date(data.date_of_joining) : undefined,
        emergency_contact_name: data.emergency_contact_name,
        emergency_contact_phone: data.emergency_contact_phone,
        emergency_contact_relation: data.emergency_contact_relation,
        personal_email: data.personal_email,
        pan_number: data.pan_number,
        aadhaar_number: data.aadhaar_number,
        highest_qualification: data.highest_qualification,
        uan_number: data.uan_number,
        bank_account_number: data.bank_account_number,
        bank_name: data.bank_name,
        bank_ifsc_code: data.bank_ifsc_code,
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
        father_or_guardian_name: true,
        gender: true,
        date_of_birth: true,
        current_address: true,
        permanent_address: true,
        date_of_joining: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relation: true,
        personal_email: true,
        pan_number: true,
        aadhaar_number: true,
        highest_qualification: true,
        uan_number: true,
        bank_account_number: true,
        bank_name: true,
        bank_ifsc_code: true,
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
        ...(data.last_name !== undefined && { last_name: data.last_name }),
        ...(data.designation !== undefined && { designation: data.designation }),
        ...(data.department !== undefined && { department: data.department }),
        ...(data.shift !== undefined && { shift: data.shift }),
        ...(data.reporting_manager_id !== undefined && {
          reporting_manager_id: data.reporting_manager_id,
        }),
        ...(data.status && { status: data.status }),
        ...(data.avatar_url !== undefined && { avatar_url: data.avatar_url }),
        ...(data.father_or_guardian_name !== undefined && { father_or_guardian_name: data.father_or_guardian_name }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.date_of_birth !== undefined && { date_of_birth: data.date_of_birth ? new Date(data.date_of_birth) : null }),
        ...(data.current_address !== undefined && { current_address: data.current_address }),
        ...(data.permanent_address !== undefined && { permanent_address: data.permanent_address }),
        ...(data.date_of_joining !== undefined && { date_of_joining: data.date_of_joining ? new Date(data.date_of_joining) : null }),
        ...(data.emergency_contact_name !== undefined && { emergency_contact_name: data.emergency_contact_name }),
        ...(data.emergency_contact_phone !== undefined && { emergency_contact_phone: data.emergency_contact_phone }),
        ...(data.emergency_contact_relation !== undefined && { emergency_contact_relation: data.emergency_contact_relation }),
        ...(data.personal_email !== undefined && { personal_email: data.personal_email }),
        ...(data.pan_number !== undefined && { pan_number: data.pan_number }),
        ...(data.aadhaar_number !== undefined && { aadhaar_number: data.aadhaar_number }),
        ...(data.highest_qualification !== undefined && { highest_qualification: data.highest_qualification }),
        ...(data.uan_number !== undefined && { uan_number: data.uan_number }),
        ...(data.bank_account_number !== undefined && { bank_account_number: data.bank_account_number }),
        ...(data.bank_name !== undefined && { bank_name: data.bank_name }),
        ...(data.bank_ifsc_code !== undefined && { bank_ifsc_code: data.bank_ifsc_code }),
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
  father_or_guardian_name?: string;
  gender?: string;
  date_of_birth?: string;
  current_address?: string;
  permanent_address?: string;
  date_of_joining?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relation?: string;
  personal_email?: string;
  pan_number?: string;
  aadhaar_number?: string;
  highest_qualification?: string;
  uan_number?: string;
  bank_account_number?: string;
  bank_name?: string;
  bank_ifsc_code?: string;
}

// Normalize CSV column headers to our internal field names
// Supports: "EMP CODE" / "emp_code", "Emp First Name" / "first_name", etc.
function normalizeHeaders(raw: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.trim().toLowerCase().replace(/\s+/g, '_');
    // Identity fields
    if (k.includes('official') && k.includes('email') || k === 'email' || k === 'email_id') {
      mapped.email = value;
    } else if (k.includes('personal') && k.includes('email')) {
      mapped.personal_email = value;
    } else if (k.includes('first') && k.includes('name')) {
      mapped.first_name = value;
    } else if (k.includes('last') && k.includes('name')) {
      mapped.last_name = value;
    } else if ((k.includes('emp') && k.includes('code')) || k === 'employee_id') {
      mapped.emp_code = value;
    } else if (k.includes('father') || k.includes('guardian') || k.includes('c/o') || k.includes('co_name')) {
      mapped.father_or_guardian_name = value;
    } else if (k === 'gender' || k === 'sex') {
      mapped.gender = value;
    } else if (k === 'dob' || k.includes('date_of_birth') || k === 'birth_date') {
      mapped.date_of_birth = value;
    } else if (k.includes('current') && k.includes('address')) {
      mapped.current_address = value;
    } else if (k.includes('permanent') && k.includes('address')) {
      mapped.permanent_address = value;
    } else if (k.includes('phone') || k.includes('mobile')) {
      // Skip if already mapped emergency contact phone
      if (!k.includes('emergency') && !k.includes('contact')) {
        mapped.phone = value;
      }
    } else if (k === 'doj' || k.includes('date_of_joining') || k === 'joining_date') {
      mapped.date_of_joining = value;
    } else if (k.includes('emergency') && (k.includes('name') || k.includes('person_name'))) {
      mapped.emergency_contact_name = value;
    } else if (k.includes('emergency') && (k.includes('no') || k.includes('phone') || k.includes('number'))) {
      mapped.emergency_contact_phone = value;
    } else if (k.includes('emergency') && k.includes('relation')) {
      mapped.emergency_contact_relation = value;
    } else if (k === 'pan' || k.includes('pan_number') || k.includes('pan_no')) {
      mapped.pan_number = value;
    } else if (k.includes('adhaar') || k.includes('aadhaar') || k.includes('aadhar')) {
      mapped.aadhaar_number = value;
    } else if (k.includes('qualification') || k.includes('education')) {
      mapped.highest_qualification = value;
    } else if (k.includes('uan')) {
      mapped.uan_number = value;
    } else if (k.includes('designation') || k === 'title' || k === 'role_title') {
      mapped.designation = value;
    } else if (k.includes('department') || k === 'dept') {
      mapped.department = value;
    } else if (k.includes('account') && k.includes('no') || k.includes('account_number')) {
      mapped.bank_account_number = value;
    } else if (k.includes('bank') && k.includes('name')) {
      mapped.bank_name = value;
    } else if (k.includes('ifsc')) {
      mapped.bank_ifsc_code = value;
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
      father_or_guardian_name: z.string().optional(),
      gender: z.string().optional(),
      date_of_birth: z.string().optional(),
      current_address: z.string().optional(),
      permanent_address: z.string().optional(),
      date_of_joining: z.string().optional(),
      emergency_contact_name: z.string().optional(),
      emergency_contact_phone: z.string().optional(),
      emergency_contact_relation: z.string().optional(),
      personal_email: z.string().optional(),
      pan_number: z.string().optional(),
      aadhaar_number: z.string().optional(),
      highest_qualification: z.string().optional(),
      uan_number: z.string().optional(),
      bank_account_number: z.string().optional(),
      bank_name: z.string().optional(),
      bank_ifsc_code: z.string().optional(),
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
      select: { id: true, email: true },
    });
    const existingEmailMap = new Map(existingUsers.map((u) => [u.email, u.id]));

    // Parse date strings from CSV (DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, etc.)
    function parseCsvDate(val?: string): Date | undefined {
      if (!val || !val.trim()) return undefined;
      const s = val.trim();
      // DD/MM/YYYY or DD-MM-YYYY
      const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmy) return new Date(Date.UTC(+dmy[3], +dmy[2] - 1, +dmy[1]));
      // DD-MMM-YYYY
      const months: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
      const mdy = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{4})$/);
      if (mdy && months[mdy[2].toLowerCase()] !== undefined) return new Date(Date.UTC(+mdy[3], months[mdy[2].toLowerCase()], +mdy[1]));
      // Fallback
      const d = new Date(s);
      return isNaN(d.getTime()) ? undefined : d;
    }

    // Build extra fields object from a row
    function buildExtraFields(row: CsvRow) {
      return {
        ...(row.father_or_guardian_name && { father_or_guardian_name: row.father_or_guardian_name }),
        ...(row.gender && { gender: row.gender }),
        ...(row.date_of_birth && { date_of_birth: parseCsvDate(row.date_of_birth) }),
        ...(row.current_address && { current_address: row.current_address }),
        ...(row.permanent_address && { permanent_address: row.permanent_address }),
        ...(row.date_of_joining && { date_of_joining: parseCsvDate(row.date_of_joining) }),
        ...(row.emergency_contact_name && { emergency_contact_name: row.emergency_contact_name }),
        ...(row.emergency_contact_phone && { emergency_contact_phone: row.emergency_contact_phone }),
        ...(row.emergency_contact_relation && { emergency_contact_relation: row.emergency_contact_relation }),
        ...(row.personal_email && { personal_email: row.personal_email }),
        ...(row.pan_number && { pan_number: row.pan_number }),
        ...(row.aadhaar_number && { aadhaar_number: row.aadhaar_number }),
        ...(row.highest_qualification && { highest_qualification: row.highest_qualification }),
        ...(row.uan_number && { uan_number: row.uan_number }),
        ...(row.bank_account_number && { bank_account_number: row.bank_account_number }),
        ...(row.bank_name && { bank_name: row.bank_name }),
        ...(row.bank_ifsc_code && { bank_ifsc_code: row.bank_ifsc_code }),
      };
    }

    const employeeSelect = {
      id: true, email: true, first_name: true, last_name: true,
      employee_id: true, department: true, designation: true,
    };

    // Create new + update existing in a transaction
    const defaultPassword = `Welcome@${new Date().getFullYear()}`;
    const passwordHash = await hashPassword(defaultPassword);

    let createdCount = 0;
    let updatedCount = 0;

    const results = await prisma.$transaction(async (tx) => {
      const allEmployees = [];
      for (const row of validRows) {
        const email = row.email.toLowerCase();
        const existingId = existingEmailMap.get(email);
        const extra = buildExtraFields(row);

        if (existingId) {
          const updated = await tx.user.update({
            where: { id: existingId },
            data: {
              first_name: row.first_name,
              last_name: row.last_name,
              ...(row.emp_code && { employee_id: row.emp_code }),
              ...(row.phone && { phone: row.phone }),
              ...(row.designation && { designation: row.designation }),
              ...(row.department && { department: row.department }),
              ...(row.shift && { shift: row.shift }),
              ...extra,
            },
            select: employeeSelect,
          });
          allEmployees.push(updated);
          updatedCount++;
        } else {
          const employeeId = row.emp_code || await generateUniqueEmployeeId(orgId);
          const created = await tx.user.create({
            data: {
              org_id: orgId,
              email,
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
              ...extra,
            },
            select: employeeSelect,
          });
          allEmployees.push(created);
          createdCount++;
        }
      }
      return allEmployees;
    });

    sendCreated(res, {
      imported: createdCount,
      updated: updatedCount,
      employees: results,
      defaultPassword: createdCount > 0 ? defaultPassword : undefined,
    }, `${createdCount} created, ${updatedCount} updated`);
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
          check_in_lat: true,
          check_in_lng: true,
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
  office_lat: z.number().min(-90).max(90).optional().nullable(),
  office_lng: z.number().min(-180).max(180).optional().nullable(),
}).superRefine((data, ctx) => {
  const hasOfficeLat = data.office_lat !== undefined;
  const hasOfficeLng = data.office_lng !== undefined;

  if (hasOfficeLat !== hasOfficeLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'office_lat and office_lng must be provided together',
      path: hasOfficeLat ? ['office_lng'] : ['office_lat'],
    });
    return;
  }

  const clearsOfficeLat = data.office_lat === null;
  const clearsOfficeLng = data.office_lng === null;

  if (clearsOfficeLat !== clearsOfficeLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'office_lat and office_lng must both be null when clearing the office location',
      path: clearsOfficeLat ? ['office_lng'] : ['office_lat'],
    });
  }
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
        office_lat: true,
        office_lng: true,
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

    const { logo_url, brand_colour, office_lat, office_lng } = parsed.data;

    const updated = await prisma.organisation.update({
      where: { id: orgId },
      data: {
        ...(logo_url !== undefined && { logo_url }),
        ...(brand_colour !== undefined && { brand_colour }),
        ...(office_lat !== undefined && { office_lat }),
        ...(office_lng !== undefined && { office_lng }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo_url: true,
        brand_colour: true,
        timezone: true,
        plan: true,
        office_lat: true,
        office_lng: true,
      },
    });

    sendSuccess(res, updated, 'Organisation settings updated');
  } catch (error) {
    next(error);
  }
}
