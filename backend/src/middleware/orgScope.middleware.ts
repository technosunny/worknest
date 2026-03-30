import { Request, Response, NextFunction } from 'express';
import { sendForbidden, sendUnauthorized } from '../utils/response.utils';

/**
 * Middleware to ensure org-scoped routes have an orgId in the JWT
 * Prevents org admins and employees from accessing data outside their org
 */
export function requireOrgScope(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required');
    return;
  }

  if (!req.user.orgId) {
    sendForbidden(
      res,
      'No organisation associated with this account'
    );
    return;
  }

  next();
}

/**
 * Middleware to ensure a route param :orgId matches the user's orgId
 * (unless they are a super_admin)
 */
export function enforceOrgAccess(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendUnauthorized(res, 'Authentication required');
    return;
  }

  // Super admins can access any org
  if (req.user.role === 'super_admin') {
    next();
    return;
  }

  const paramOrgId = req.params.orgId;
  if (paramOrgId && paramOrgId !== req.user.orgId) {
    sendForbidden(res, 'Access denied to this organisation');
    return;
  }

  next();
}
