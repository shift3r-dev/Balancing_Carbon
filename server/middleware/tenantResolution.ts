import { type NextFunction, type Response } from 'express';
import { type AuthenticatedRequest, getProfile } from '../auth.js';

export interface TenantRequest extends AuthenticatedRequest { tenantId?: string }

/** Optional tenant context resolver. Routes remain responsible for existing access checks. */
export async function resolveTenant(req: TenantRequest, _res: Response, next: NextFunction) {
  if (!req.authUser) return next();
  try {
    req.tenantId = (await getProfile(req.authUser.id)).organisation_id;
  } catch {
    // Authentication middleware and route handlers retain the existing error contract.
  }
  next();
}
