import { type NextFunction, type Request, type Response } from 'express';
import { type User } from '@supabase/supabase-js';
import { supabaseAdmin } from './supabaseClients.js';
import { getAuthorizationContext, type AuthorizationContext } from './authorization.js';

export interface AuthenticatedRequest extends Request {
  authUser?: User;
  authorization?: AuthorizationContext;
}

export interface Profile {
  id: string;
  full_name: string;
  organisation_id: string;
  role: string;
  created_at: string;
}

function bearer(req: Request) {
  const h = req.headers.authorization;
  return h?.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = bearer(req);
  if (!token) return res.status(401).json({ error: 'Authentication required.' });
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  req.authUser = data.user;
  try {
    req.authorization = await getAuthorizationContext(data.user.id);
  } catch (contextError) {
    return res.status(403).json({ error: contextError instanceof Error ? contextError.message : 'Unable to resolve organization access.' });
  }
  next();
}

export const requireAuthenticated = requireAuth;

export function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authorization?.permissions.includes(permission)) return res.status(403).json({ error: 'You do not have permission to perform this action.', permission });
    next();
  };
}

export function requireRole(role: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authorization?.roles.includes(role)) return res.status(403).json({ error: 'You do not have the required role.', role });
    next();
  };
}

export function requireOrganization(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.authorization?.organisationId) return res.status(403).json({ error: 'Organization membership is required.' });
  next();
}

export function requireOwnership(resolveOwnerId: (req: AuthenticatedRequest) => string | undefined) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const ownerId = resolveOwnerId(req);
    if (ownerId && ownerId !== req.authUser?.id) return res.status(403).json({ error: 'You do not own this resource.' });
    next();
  };
}

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error(`Profile lookup failed: ${error?.message ?? 'not found'}`);
  return data as Profile;
}
