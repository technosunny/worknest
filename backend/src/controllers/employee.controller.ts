import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import path from 'path';
import prisma from '../lib/prisma';
import {
  sendSuccess,
  sendBadRequest,
  sendNotFound,
  buildPagination,
  parsePagination,
} from '../utils/response.utils';

const checkInSchema = z.object({
  lat: z.number().min(-90).max(90, 'Invalid latitude'),
  lng: z.number().min(-180).max(180, 'Invalid longitude'),
});

const checkOutSchema = z.object({
  lat: z.number().min(-90).max(90, 'Invalid latitude'),
  lng: z.number().min(-180).max(180, 'Invalid longitude'),
});

function getTodayDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function calculateHours(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
}

export async function getProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        org_id: true,
        created_at: true,
        updated_at: true,
        organisation: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo_url: true,
            brand_colour: true,
            timezone: true,
          },
        },
        reporting_manager: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            employee_id: true,
            designation: true,
            email: true,
          },
        },
      },
    });

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

const updateProfileSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data = updateProfileSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        designation: true,
        department: true,
        avatar_url: true,
      },
    });

    sendSuccess(res, updated, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      sendBadRequest(res, 'Current password is incorrect');
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash },
    });

    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

export async function checkIn(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const orgId = req.user!.orgId!;

    // Parse coordinates from body (could be multipart/form-data or JSON)
    let lat: number;
    let lng: number;

    try {
      const coords = checkInSchema.parse({
        lat: parseFloat(req.body.lat),
        lng: parseFloat(req.body.lng),
      });
      lat = coords.lat;
      lng = coords.lng;
    } catch {
      sendBadRequest(res, 'Valid latitude and longitude are required');
      return;
    }

    const today = getTodayDate();

    // Check if already checked in today
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        user_id: userId,
        org_id: orgId,
        date: today,
      },
    });

    if (existingAttendance) {
      if (existingAttendance.check_in_time) {
        sendBadRequest(res, 'You have already checked in today');
        return;
      }
    }

    // Handle selfie upload
    let selfieUrl: string | undefined;
    if (req.file) {
      selfieUrl = req.file.path.replace(/\\/g, '/');
    }

    const now = new Date();

    let attendance;
    if (existingAttendance) {
      attendance = await prisma.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          check_in_time: now,
          check_in_lat: lat,
          check_in_lng: lng,
          check_in_selfie_url: selfieUrl,
          status: 'present',
        },
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          org_id: orgId,
          user_id: userId,
          check_in_time: now,
          check_in_lat: lat,
          check_in_lng: lng,
          check_in_selfie_url: selfieUrl,
          status: 'present',
          date: today,
        },
      });
    }

    sendSuccess(res, {
      id: attendance.id,
      check_in_time: attendance.check_in_time,
      check_in_lat: attendance.check_in_lat,
      check_in_lng: attendance.check_in_lng,
      check_in_selfie_url: attendance.check_in_selfie_url,
      status: attendance.status,
      date: attendance.date,
    }, 'Checked in successfully');
  } catch (error) {
    next(error);
  }
}

export async function checkOut(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const orgId = req.user!.orgId!;

    const { lat, lng } = checkOutSchema.parse(req.body);

    const today = getTodayDate();

    // Find today's attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        user_id: userId,
        org_id: orgId,
        date: today,
      },
    });

    if (!attendance) {
      sendBadRequest(res, 'No check-in record found for today. Please check in first.');
      return;
    }

    if (!attendance.check_in_time) {
      sendBadRequest(res, 'You have not checked in today yet.');
      return;
    }

    if (attendance.check_out_time) {
      sendBadRequest(res, 'You have already checked out today');
      return;
    }

    const now = new Date();
    const totalHours = calculateHours(attendance.check_in_time, now);

    // Determine status based on hours worked
    let status = attendance.status;
    if (totalHours < 4) {
      status = 'half_day';
    } else {
      status = 'present';
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        check_out_time: now,
        check_out_lat: lat,
        check_out_lng: lng,
        total_hours: totalHours,
        status,
      },
    });

    sendSuccess(res, {
      id: updated.id,
      check_in_time: updated.check_in_time,
      check_out_time: updated.check_out_time,
      total_hours: updated.total_hours,
      status: updated.status,
      date: updated.date,
    }, 'Checked out successfully');
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceHistory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const orgId = req.user!.orgId!;
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
    const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

    const where: Record<string, unknown> = { user_id: userId, org_id: orgId };

    if (month !== undefined && year !== undefined) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0); // Last day of the month
      where.date = { gte: startDate, lte: endDate };
    } else if (year !== undefined) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31);
      where.date = { gte: startDate, lte: endDate };
    } else {
      // Default: current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    // Calculate summary
    const allRecords = await prisma.attendance.findMany({
      where,
      select: { status: true, total_hours: true },
    });

    const summary = {
      present: allRecords.filter((r) => r.status === 'present').length,
      half_day: allRecords.filter((r) => r.status === 'half_day').length,
      absent: allRecords.filter((r) => r.status === 'absent').length,
      weekend: allRecords.filter((r) => r.status === 'weekend').length,
      holiday: allRecords.filter((r) => r.status === 'holiday').length,
      total_hours: allRecords.reduce((sum, r) => sum + (r.total_hours || 0), 0),
    };

    sendSuccess(
      res,
      { records, summary },
      'Attendance history fetched successfully',
      200,
      buildPagination(page, limit, total)
    );
  } catch (error) {
    next(error);
  }
}

export async function getTodayAttendance(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const orgId = req.user!.orgId!;
    const today = getTodayDate();

    const attendance = await prisma.attendance.findFirst({
      where: {
        user_id: userId,
        org_id: orgId,
        date: today,
      },
    });

    if (!attendance) {
      sendSuccess(res, {
        checked_in: false,
        checked_out: false,
        date: today,
        status: 'not_recorded',
      }, 'No attendance record for today');
      return;
    }

    sendSuccess(res, {
      id: attendance.id,
      checked_in: !!attendance.check_in_time,
      checked_out: !!attendance.check_out_time,
      check_in_time: attendance.check_in_time,
      check_out_time: attendance.check_out_time,
      check_in_lat: attendance.check_in_lat,
      check_in_lng: attendance.check_in_lng,
      check_out_lat: attendance.check_out_lat,
      check_out_lng: attendance.check_out_lng,
      check_in_selfie_url: attendance.check_in_selfie_url,
      total_hours: attendance.total_hours,
      status: attendance.status,
      date: attendance.date,
    }, "Today's attendance fetched");
  } catch (error) {
    next(error);
  }
}
