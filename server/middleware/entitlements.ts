import { type NextFunction, type Response } from 'express';

import { type AuthenticatedRequest } from '../auth.js';
import { getEntitlement, getLicense, getLimit, isOperationalLicense, limitAllows } from '../entitlementService.js';

type UsageResolver = (organisationId: string, req: AuthenticatedRequest) => Promise<number>;

export function requireOperationalLicense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  void getLicense(req.authorization!.organisationId).then((license) => {
    if (!isOperationalLicense(license)) return res.status(403).json({ error: 'This organisation license is not active for changes.', code: 'license_inactive', licenseStatus: license?.status ?? 'not-configured' });
    next();
  }).catch((error) => res.status(503).json({ error: error instanceof Error ? error.message : 'License validation failed.', code: 'license_unavailable' }));
}

export function requireEntitlement(key: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    void getEntitlement(req.authorization!.organisationId, key).then((entitlement) => {
      if (!entitlement?.enabled) return res.status(403).json({ error: 'Your plan does not include this capability.', code: 'feature_not_entitled', entitlement: key });
      next();
    }).catch((error) => res.status(503).json({ error: error instanceof Error ? error.message : 'Entitlement validation failed.', code: 'entitlement_unavailable' }));
  };
}

export function requireLimit(key: string, resolveUsage: UsageResolver) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const organisationId = req.authorization!.organisationId;
    void Promise.all([getLimit(organisationId, key), resolveUsage(organisationId, req)]).then(([limit, current]) => {
      if (!limitAllows(limit, current)) return res.status(403).json({ error: `The ${key.replaceAll('_', ' ')} limit has been reached.`, code: 'limit_reached', limit: { ...limit, current } });
      next();
    }).catch((error) => res.status(503).json({ error: error instanceof Error ? error.message : 'Limit validation failed.', code: 'limit_unavailable' }));
  };
}
