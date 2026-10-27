# GitHub counts

`github-stats.mjs` finds repository links in the existing project cards. Code and Docs links to the same repository get one pair of counts. A count of zero is real; a failed request is not shown as zero. The module tries the checked-in snapshot first, then public GitHub REST metadata. Browser results are cached for an hour. Requests are limited to three at a time, with a five-second timeout and no authentication.

Refresh the public snapshot with:

```powershell
node scripts/refresh-github-data.mjs
node scripts/refresh-github-data.mjs --dry-run
node --test tests/github-data.test.mjs
```

`--check` is an alias for `--dry-run`. Both fetch and validate without writing. The normal command writes only `data/github-activity.json`, using an atomic replacement. A failed refresh leaves the previous file intact. An unchanged payload does not rewrite the timestamp. This script does not schedule itself, commit, or push.

The existing desktop automation owns refreshes. Run it on `ABHIONEMILLION`, not a laptop schedule. It can use the desktop's existing GitHub CLI sign-in; it never reads credential files or prints CLI authentication output. If the CLI is unavailable, the public profile calendar works without signing in.

The snapshot contains only linked public repository URLs, stars, forks, and public-profile contribution dates and totals. Authenticated GraphQL results are used only when no restricted activity is present. Otherwise, the script reads the unauthenticated public profile chart so the site cannot reveal activity beyond what GitHub already shows publicly. GitHub can include anonymous private activity in that public chart if the account owner has enabled it. No private repository names, commit messages, emails, or event details are requested or stored.

GitHub references: [repository metadata](https://docs.github.com/en/rest/repos/repos#get-a-repository), [GraphQL contribution types](https://docs.github.com/en/graphql/reference/objects#contributioncalendar), and [private contribution visibility](https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/manage-visibility-settings-for-private-contributions-and-achievements).
