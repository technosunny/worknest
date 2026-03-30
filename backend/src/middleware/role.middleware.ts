import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { sendForbidden, sendUnauthorized } from '../utils/response.utils';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res, 'Authentication required');
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(
        res,
        `Access denied. Required role(s): ${roles.join(', ')}`
      );
      return;
    }

    next();
  };
}

export const requireSuperAdmin = requireRole(UserRole.super_admin);
export const requireOrgAdmin = requireRole(UserRole.org_admin);
export const requireEmployee = requireRole(
  UserRole.employee,
  UserRole.org_admin,
  UserRole.super_admin
);
export const requireOrgAdminOrSuperAdmin = requireRole(
  UserRole.org_admin,
  UserRole.super_admin
);
