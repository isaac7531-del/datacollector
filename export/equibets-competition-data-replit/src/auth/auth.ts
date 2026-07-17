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
      return { id: "anonymous-dev", roles: [this.adminRole] };
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
