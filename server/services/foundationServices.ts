/** Future-ready service contracts. They intentionally do not enable billing, flags, or AI calls. */
export class OrganisationService {
  async assertMembership(organisationId: string, userId: string) { return { organisationId, userId }; }
}

export class PermissionService {
  async can(_userId: string, _permission: string) { return true; }
}

export class SubscriptionService {
  async getStatus(_organisationId: string) { return { enabled: false, status: 'not-configured' as const }; }
}

export class AuditService {
  async record(_event: { organisationId: string; action: string; actorId?: string; metadata?: Record<string, unknown> }) { return; }
}

export class UsageService {
  async record(_metric: { organisationId: string; metric: string; quantity?: number }) { return; }
}

export class NotificationService {
  async send(_notification: { organisationId: string; recipientId?: string; message: string }) { return; }
}

export class FeatureFlagService {
  async isEnabled(_organisationId: string, _flag: string) { return false; }
}

export class CalculationService {
  // Calculation modules remain pure and are imported directly by current routes.
}

export class AIService {
  async isAvailable() { return false; }
}
