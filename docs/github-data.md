# GitHub counts

`github-stats.mjs` finds repository links in the existing project cards. Code and Docs links to the same repository get one pair of counts. A count of zero is real; a failed request is not shown as zero. The module tries the checked-in snapshot first, then public GitHub REST metadata. Browser results are cached for an hour. Requests are limited to three at a time, with a five-second timeout and no authentication.

Refresh the public snapshot with:

```powershell
node scripts/refresh-github-data.mjs
node scripts/refresh-github-data.mjs --dry-run
node --test tests/github-data.test.mjs
```

`--check` is an alias for `--dry-run`. Both fetch and validate without writing. The normal command writes only `data/github-activity.json`, using an atomic replacement. A failed refresh leaves the previous file intact. An unchanged payload does not rewrite the timestamp. This script does not schedule itself, commit, or push.

For automatic publication, use `scripts/publish-github-data.mjs` on `ABHIONEMILLION` with its bundled OpenClaw Node runtime. It refuses laptop execution, checks the canonical checkout and `main` branch, and preserves unrelated work. Its exact public-data allowlist is `data/github-activity.json`, `data/linkedin-posts.json`, and `data/writing.json`. It validates each file and the cross-feed relationship, commits meaningful changes only, and verifies per-path hashes before pushing. A failed push retains its owned commit for a safe normal retry. It never force-pushes or creates branches. See [Writing](writing.md) for the curated public LinkedIn URLs, local blog sources, and explicit discovery limitations.

The contribution view is a static star-map timeline. Each real date has one point at its chronological horizontal position. Filled point area is proportional to contributions; hollow points mean zero. Vertical position is deterministic visual spacing, not another data metric. The native date slider and pointer/touch selection expose exact dates and counts.

Publishing uses a repository-specific desktop deploy key through Git's bundled SSH client on port 443. The private key stays on the desktop with owner-only permissions. The publisher uses a dedicated, verified GitHub host pin and process-local transport settings; it leaves the saved HTTPS origin, other repositories, and account-wide credentials alone. Public data fetching still works without a GitHub CLI sign-in.

Use one model-free native OpenClaw command job at 07:15 `America/Chicago`. Activate it only after an actual scheduler-run publication receipt proves that the desktop runtime can fetch and push. Keep any laptop copy paused and preserve the separate weekly portfolio-maintenance job. Do not create duplicate refresh jobs. The publisher's journal and transition-only failure notices stay outside this public repository.

The snapshot contains only linked public repository URLs, stars, forks, and public-profile contribution dates and totals. Authenticated GraphQL results are used only when no restricted activity is present. Otherwise, the script reads the unauthenticated public profile chart so the site cannot reveal activity beyond what GitHub already shows publicly. GitHub can include anonymous private activity in that public chart if the account owner has enabled it. No private repository names, commit messages, emails, or event details are requested or stored.

GitHub references: [repository metadata](https://docs.github.com/en/rest/repos/repos#get-a-repository), [GraphQL contribution types](https://docs.github.com/en/graphql/reference/objects#contributioncalendar), and [private contribution visibility](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/manage-visibility-settings-for-private-contributions-and-achievements).
