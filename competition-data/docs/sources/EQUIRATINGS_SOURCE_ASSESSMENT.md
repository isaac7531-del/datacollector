# EquiRatings source assessment

Assessment date: 2026-07-18

## Organisation and provider role

- Organisation: EquiRatings.
- Nature: data/analytics company, not a national federation.
- API documentation exists at `https://eventing.documentation.equiratings.com/`.
- Public terms state content/databases/marks are proprietary and commercial exploitation requires permission.

## Reconnaissance findings

- Public data: public articles, guides and some ranking/profile pages are visible.
- API access: requires JWT tokens and contacting EquiRatings for provider account setup.
- Result data: API documentation shows eventing result objects, but this is partner/API access, not open public access.
- Proprietary content: Elo, Win Chance, HPR, predictions, ratings, performance indexes and editorial analysis are proprietary/derived analytics.
- Authentication: required for API.
- robots: allows general crawling, but terms restrict copying/aggregation/commercial use.
- Server collection viability: not appropriate for proprietary data without permission.

## Recommended mode

- Acquisition mode: `administrator-assisted` or authorised partner API.
- Automation level: `administrator_assisted`.
- Current lifecycle: `registered`.

## Connector outcome

Permitted outcomes pending licence:

- Partner/API connector requiring credentials.
- Public-link and attribution connector.
- Disabled pending licensing.

Do not copy proprietary ratings, predictions or analytics into EquiBets without written authorisation.
