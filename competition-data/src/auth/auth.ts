import type { IncomingMessage } from "http";

export interface AuthenticatedPrincipal {
  id: string;
  roles: string[];
  tenantId?: string;
}

export interface AuthAdapter {
  authenticate(request: IncomingMessage): Promise<AuthenticatedPrincipal | undefined>;
  authorize(principal: AuthenticatedPrincipal | undefined, action: string): Promise<boolean>;
}

export class ApiKeyAuthAdapter implements AuthAdapter {
  constructor(private readonly apiKey: string | undefined, private readonly adminRole = "competition-data-admin") {}

  async authenticate(request: IncomingMessage): Promise<AuthenticatedPrincipal | undefined> {
    if (!this.apiKey) {
      return undefined;
    }

    if (request.headers.authorization === `Bearer ${this.apiKey}`) {
      return { id: "api-key", roles: [this.adminRole] };
    }

    return undefined;
  }

  async authorize(principal: AuthenticatedPrincipal | undefined, _action: string): Promise<boolean> {
    return !!principal?.roles.includes(this.adminRole);
  }
}

export class DevelopmentAuthAdapter implements AuthAdapter {
  constructor(private readonly enabled = process.env.NODE_ENV !== "production") {
    if (!this.enabled) {
      throw new Error("DevelopmentAuthAdapter cannot be enabled in production.");
    }
  }

  async authenticate(): Promise<AuthenticatedPrincipal> {
    return { id: "development-user", roles: ["competition-data-admin"], tenantId: "development" };
  }

  async authorize(): Promise<boolean> {
    return true;
  }
}
