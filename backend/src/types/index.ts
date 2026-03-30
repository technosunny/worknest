import { Request } from 'express';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  userId: string;
  orgId: string | null;
  role: UserRole;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  userId: string;
  orgId: string | null;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface CreateOrgRequest {
  name: string;
  slug: string;
  plan?: string;
  timezone?: string;
  brand_colour?: string;
  adminEmail: string;
  adminName: string;
  adminPhone?: string;
  adminPassword?: string;
}

export interface UpdateOrgRequest {
  name?: string;
  logo_url?: string;
  brand_colour?: string;
  timezone?: string;
  plan?: string;
  status?: string;
  subscription_id?: string;
}

export interface CreateEmployeeRequest {
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  designation?: string;
  department?: string;
  shift?: string;
  reporting_manager_id?: string;
  password?: string;
}

export interface UpdateEmployeeRequest {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  designation?: string;
  department?: string;
  shift?: string;
  reporting_manager_id?: string;
  status?: string;
  avatar_url?: string;
}

export interface CheckInRequest {
  lat: number;
  lng: number;
}

export interface CheckOutRequest {
  lat: number;
  lng: number;
}

export interface AttendanceFilter {
  month?: string;
  year?: string;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
