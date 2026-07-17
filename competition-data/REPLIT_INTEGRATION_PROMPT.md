# Replit integration prompt

You are integrating `@equibets/competition-data` into the existing EquiBets Replit application.

Do not replace working EquiBets systems unnecessarily. Inspect the current repository first and reuse existing database models, authentication, Data Operations Centre, Resolution Centre, Import History, Undo Imports, Coverage Intelligence, Entity Health Scores, EBI, profile pages, notifications and scheduled jobs where practical.

Steps:

1. Inspect the EquiBets Replit repository structure, package manager, ORM, existing competition/result models, import framework, queues/workers, auth, roles and env conventions.
2. Review:
   - `competition-data/README.md`
   - `competition-data/docs/CURRENT_IMPLEMENTATION.md`
   - `competition-data/docs/API.md`
   - `competition-data/docs/CONNECTORS.md`
   - `competition-data/docs/DATABASE.md`
   - `competition-data/REPLIT_HANDOFF.md`
3. Install the package by copying it as a workspace package, installing a local archive, using the private Git repository, or a private registry later. Do not require public npm publication.
4. Connect PostgreSQL:
   - Either run the supplied migrations and use `createPostgresRepositories`, or
   - implement `CompetitionDataRepository` with the existing ORM (Prisma, Drizzle, Kysely or other).
5. Preserve tenant isolation in all repository methods.
6. Connect authentication and role authorization using `AuthAdapter`.
7. Connect the Data Operations Centre to import runs, staged records and connector health.
8. Connect the Resolution Centre to resolution candidates and conflicts.
9. Connect Import History and Undo Imports to import runs, staged records and repository-specific rollback.
10. Connect Coverage Intelligence and Entity Health Scores to emitted events.
11. Connect EBI, horse profiles, rider profiles and combination profiles to canonical data and downstream events.
12. Connect downstream recalculation for predictions, rankings, timelines and coverage using idempotent event handlers.
13. Connect notifications for manual resolution, conflicts, import failures and newly verified results.
14. Preserve private Stable Manager information. Public imports must never overwrite private notes, health records, treatments, attachments, private training records, nutrition records or private owner communication.
15. Register real connectors only after confirming source terms and testing with source-owned public files or exports.
16. Keep direct FEI page automation disabled where FEI blocks automated server access. Use assisted imports and uploaded/direct public FEI exports.
17. Run:
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run demo`
18. Report changed files and any required manual Replit settings.
19. Clearly separate fully automated workflows, assisted workflows, manual workflows and unsupported workflows.
