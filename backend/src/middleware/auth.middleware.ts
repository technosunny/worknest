import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { sendUnauthorized } from '../utils/response.utils';

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      orgId: payload.orgId,
      role: payload.role,
      email: payload.email,
    };
    next();
  } catch (error) {
    if (error instanceof Error) {
      sendUnauthorized(res, error.message);
    } else {
      sendUnauthorized(res, 'Invalid token');
    }
  }
}
