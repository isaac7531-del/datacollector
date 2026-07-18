# Browser-assisted collection

Browser-assisted collection is for sources where the user can legitimately view data in their normal browser session, but ordinary server-side collection is restricted or unreliable.

Rules:

- User remains in control.
- No CAPTCHA solving.
- No stealth plugins.
- No browser fingerprint spoofing.
- No proxy rotation for blocked access.
- No credential interception.
- Only read data already rendered and visible to the user.

The `browser-collector/` scaffold currently targets FEI page types and queues captured visible-page records locally for upload to the Competition Data Engine.

Supported initial page categories:

- calendar/search result pages;
- event detail pages;
- result tables;
- horse profile pages;
- athlete profile pages;
- rankings pages.

Only page structures that have been inspected and tested should be enabled in production.
