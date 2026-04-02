import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { parse } from 'csv-parse';
import prisma from '../lib/prisma';
import {
  sendSuccess,
  sendCreated,
  sendBadRequest,
} from '../utils/response.utils';

// Shift definitions
const SHIFT_MAP: Record<string, { start: string; end: string } | null> = {
  dayshift: { start: '06:00', end: '18:00' },
  nightshift: { start: '18:00', end: '06:00' },
  wof: null, // Weekly Off
};

/**
 * Parse date strings like "01-Mar-2026" or "01-03-2026"
 */
function parseDate(dateStr: string): Date | null {
  const trimmed = dateStr.trim();

  // Try "DD-MMM-YYYY" (e.g. "01-Mar-2026")
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (match) {
    const day = parseInt(match[1]);
    const mon = monthMap[match[2].toLowerCase()];
    const year = parseInt(match[3]);
    if (mon !== undefined) {
      return new Date(Date.UTC(year, mon, day));
    }
  }

  // Try standard date parse as fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  }

  return null;
}

export async function uploadRoster(
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

    // Parse CSV with raw headers
    const rawRecords: Record<string, string>[] = await new Promise((resolve, reject) => {
      const results: Record<string, string>[] = [];
      fs.createReadStream(filePath)
        .pipe(
          parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
          })
        )
        .on('data', (row: Record<string, string>) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    fs.unlink(filePath, () => {});

    if (rawRecords.length === 0) {
      sendBadRequest(res, 'CSV file is empty');
      return;
    }

    // Extract columns: first column is employee identifier, rest are dates
    const headers = Object.keys(rawRecords[0]);
    if (headers.length < 2) {
      sendBadRequest(res, 'CSV must have employee identifier column and at least one date column');
      return;
    }

    const empColumn = headers[0]; // "Employee Email ID/Employee ID" or similar
    const dateColumns = headers.slice(1);

    // Parse date headers
    const parsedDates: { col: string; date: Date }[] = [];
    const invalidDates: string[] = [];
    for (const col of dateColumns) {
      const d = parseDate(col);
      if (d) {
        parsedDates.push({ col, date: d });
      } else {
        invalidDates.push(col);
      }
    }

    if (invalidDates.length > 0) {
      sendBadRequest(res, `Invalid date columns: ${invalidDates.join(', ')}. Use format: 01-Mar-2026`);
      return;
    }

    // Resolve employee identifiers to user IDs
    const empIdentifiers = rawRecords.map((r) => r[empColumn].trim()).filter(Boolean);
    const uniqueIdentifiers = [...new Set(empIdentifiers)];

    // Look up by employee_id or email
    const users = await prisma.user.findMany({
      where: {
        org_id: orgId,
        role: 'employee',
        OR: [
          { employee_id: { in: uniqueIdentifiers } },
          { email: { in: uniqueIdentifiers.map((e) => e.toLowerCase()) } },
        ],
      },
      select: { id: true, employee_id: true, email: true, first_name: true, last_name: true },
    });

    // Build lookup map (employee_id -> user, email -> user)
    const userMap = new Map<string, typeof users[0]>();
    for (const u of users) {
      if (u.employee_id) userMap.set(u.employee_id, u);
      userMap.set(u.email.toLowerCase(), u);
    }

    // Build roster entries
    const rosterData: { org_id: string; user_id: string; date: Date; shift_type: string; shift_start: string | null; shift_end: string | null }[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rawRecords.length; i++) {
      const row = rawRecords[i];
      const empId = row[empColumn].trim();
      const user = userMap.get(empId) || userMap.get(empId.toLowerCase());

      if (!user) {
        errors.push({ row: i + 2, message: `Employee not found: ${empId}` });
        continue;
      }

      for (const { col, date } of parsedDates) {
        const rawShift = (row[col] || '').trim().toLowerCase();
        if (!rawShift) continue; // skip empty cells

        if (!SHIFT_MAP.hasOwnProperty(rawShift)) {
          errors.push({ row: i + 2, message: `Invalid shift "${row[col]}" for date ${col}. Use: dayshift, nightshift, WOF` });
          continue;
        }

        const shiftTimes = SHIFT_MAP[rawShift];
        rosterData.push({
          org_id: orgId,
          user_id: user.id,
          date,
          shift_type: rawShift,
          shift_start: shiftTimes?.start || null,
          shift_end: shiftTimes?.end || null,
        });
      }
    }

    if (errors.length > 0 && rosterData.length === 0) {
      sendBadRequest(res, 'No valid roster entries found', JSON.stringify(errors));
      return;
    }

    // Upsert roster entries (replace existing for same org/user/date)
    let upserted = 0;
    await prisma.$transaction(async (tx) => {
      for (const entry of rosterData) {
        await tx.roster.upsert({
          where: {
            org_id_user_id_date: {
              org_id: entry.org_id,
              user_id: entry.user_id,
              date: entry.date,
            },
          },
          update: {
            shift_type: entry.shift_type,
            shift_start: entry.shift_start,
            shift_end: entry.shift_end,
          },
          create: entry,
        });
        upserted++;
      }
    });

    sendCreated(res, {
      uploaded: upserted,
      employees: uniqueIdentifiers.length,
      dates: parsedDates.length,
      warnings: errors.length > 0 ? errors : undefined,
    }, `Roster uploaded: ${upserted} entries for ${users.length} employees`);
  } catch (error) {
    next(error);
  }
}

export async function getRoster(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = req.user!.orgId!;
    const { start_date, end_date, department } = req.query;

    if (!start_date || !end_date) {
      sendBadRequest(res, 'start_date and end_date are required (YYYY-MM-DD)');
      return;
    }

    const startD = new Date(start_date as string);
    const endD = new Date(end_date as string);

    if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
      sendBadRequest(res, 'Invalid date format. Use YYYY-MM-DD');
      return;
    }

    // Optional department filter
    const userWhere: Record<string, unknown> = { org_id: orgId, role: 'employee', status: 'active' };
    if (department && department !== 'all') {
      userWhere.department = { equals: department, mode: 'insensitive' };
    }

    const employees = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        employee_id: true,
        department: true,
      },
      orderBy: { first_name: 'asc' },
    });

    const employeeIds = employees.map((e) => e.id);

    const rosters = await prisma.roster.findMany({
      where: {
        org_id: orgId,
        user_id: { in: employeeIds },
        date: { gte: startD, lte: endD },
      },
      orderBy: { date: 'asc' },
    });

    // Group by user
    const rosterMap = new Map<string, Record<string, string>>();
    for (const r of rosters) {
      const dateKey = r.date.toISOString().split('T')[0];
      if (!rosterMap.has(r.user_id)) rosterMap.set(r.user_id, {});
      rosterMap.get(r.user_id)![dateKey] = r.shift_type;
    }

    const result = employees.map((emp) => ({
      employee: emp,
      shifts: rosterMap.get(emp.id) || {},
    }));

    sendSuccess(res, {
      start_date: startD.toISOString().split('T')[0],
      end_date: endD.toISOString().split('T')[0],
      shift_definitions: {
        dayshift: { label: 'Day Shift', start: '06:00', end: '18:00' },
        nightshift: { label: 'Night Shift', start: '18:00', end: '06:00' },
        wof: { label: 'Weekly Off', start: null, end: null },
      },
      roster: result,
    }, 'Roster fetched');
  } catch (error) {
    next(error);
  }
}
