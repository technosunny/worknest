import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { comparePassword, hashPassword } from '../utils/password.utils';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.utils';
import {
  sendSuccess,
  sendBadRequest,
  sendUnauthorized,
  sendNotFound,
} from '../utils/response.utils';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            plan: true,
            timezone: true,
            brand_colour: true,
            logo_url: true,
          },
        },
      },
    });

    if (!user) {
      sendUnauthorized(res, 'Invalid email or password');
      return;
    }

    if (user.status !== 'active') {
      sendUnauthorized(res, 'Your account is inactive. Please contact your administrator.');
      return;
    }

    // Check if org is active (for non-super admins)
    if (user.role !== 'super_admin' && user.organisation) {
      if (user.organisation.status === 'suspended') {
        sendUnauthorized(
          res,
          'Your organisation account has been suspended. Please contact support.'
        );
        return;
      }
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      sendUnauthorized(res, 'Invalid email or password');
      return;
    }

    const tokenPayload = {
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
      email: user.email,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        employee_id: user.employee_id,
        designation: user.designation,
        department: user.department,
        avatar_url: user.avatar_url,
        org_id: user.org_id,
        organisation: user.organisation,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        org_id: true,
        status: true,
      },
    });

    if (!user) {
      sendUnauthorized(res, 'User not found');
      return;
    }

    if (user.status !== 'active') {
      sendUnauthorized(res, 'Account is inactive');
      return;
    }

    const tokenPayload = {
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
      email: user.email,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('token')) {
      sendUnauthorized(res, error.message);
      return;
    }
    next(error);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, password_hash: true },
    });

    if (!user) {
      sendNotFound(res, 'User not found');
      return;
    }

    const isCurrentPasswordValid = await comparePassword(
      currentPassword,
      user.password_hash
    );

    if (!isCurrentPasswordValid) {
      sendBadRequest(res, 'Current password is incorrect');
      return;
    }

    if (currentPassword === newPassword) {
      sendBadRequest(res, 'New password must be different from current password');
      return;
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: newPasswordHash },
    });

    sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}
