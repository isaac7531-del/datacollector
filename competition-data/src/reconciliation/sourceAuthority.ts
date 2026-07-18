import type { PublicationStatus, SourceAuthorityTier } from "../domain/records";

export interface SourceAuthorityRule {
  id: string;
  tier: SourceAuthorityTier;
  score: number;
  countryCode?: string;
  discipline?: string;
  organisationId?: string;
  recordType?: string;
  publicationStatus?: PublicationStatus;
}

export const defaultSourceAuthorityRules: SourceAuthorityRule[] = [
  { id: "international-final", tier: "international_federation_final", score: 100, publicationStatus: "final" },
  { id: "national-final", tier: "national_federation_final", score: 90, publicationStatus: "final" },
  { id: "provider-final", tier: "event_provider_final", score: 80, publicationStatus: "final" },
  { id: "organiser-final", tier: "organising_committee_final", score: 75, publicationStatus: "final" },
  { id: "regional-verified", tier: "regional_federation_verified", score: 65 },
  { id: "public-organiser", tier: "public_event_organiser", score: 55 },
  { id: "user-confirmed", tier: "user_confirmed", score: 45 },
  { id: "user-unverified", tier: "user_unverified", score: 20 },
  { id: "other-public", tier: "other_public", score: 30 }
];

export interface AuthorityLookup {
  tier?: SourceAuthorityTier;
  countryCode?: string;
  discipline?: string;
  organisationId?: string;
  recordType?: string;
  publicationStatus?: PublicationStatus;
}

export class SourceAuthorityPolicy {
  constructor(private readonly rules: SourceAuthorityRule[] = defaultSourceAuthorityRules) {}

  score(input: AuthorityLookup): number {
    const matches = this.rules.filter((rule) => {
      if (input.tier && rule.tier !== input.tier) return false;
      if (rule.countryCode && rule.countryCode !== input.countryCode) return false;
      if (rule.discipline && rule.discipline !== input.discipline) return false;
      if (rule.organisationId && rule.organisationId !== input.organisationId) return false;
      if (rule.recordType && rule.recordType !== input.recordType) return false;
      if (rule.publicationStatus && rule.publicationStatus !== input.publicationStatus) return false;
      return true;
    });

    if (!matches.length) {
      return 0;
    }

    return Math.max(...matches.map((rule) => rule.score));
  }
}
