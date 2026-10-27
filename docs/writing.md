# Writing

The homepage and `/blog/` read `data/writing.json`. It combines Abhi's verified public LinkedIn originals with local blog posts, newest first. Equal dates use the stable post ID as a tie-breaker. There are no generated articles or rewritten LinkedIn bodies.

## Local posts

Add a UTF-8 Markdown file under `content/blog/` with this frontmatter:

```markdown
---
title: "A real post title"
date: 2026-10-27
id: a-real-post
---
The post's actual text goes here.
```

The example is documentation, not a published post. IDs start with a lowercase letter or digit, contain 1 to 100 lowercase letters, digits, hyphens or underscores, and must be unique across the feed. Titles are at most 500 characters. A date-only value means midnight in `America/Chicago`, using the correct daylight-saving offset. For example, `2026-10-27` becomes `2026-10-27T05:00:00.000Z`; a winter date uses `06:00Z`. An explicit ISO timestamp with timezone is kept unchanged. The body is plain text or plain Markdown rendered as inert text. Raw HTML, executable markup and extra frontmatter fields are rejected. The local URL is `/blog/?post=a-real-post`.

Run the importer before previewing or publishing:

```powershell
node scripts/refresh-writing-data.mjs
node scripts/refresh-writing-data.mjs --check
```

`--check` and `--dry-run` validate and fetch without writing. The importer prepares and validates both data files before replacement, rolls back its own completed replacements on a write failure, and refuses to overwrite concurrent edits. Unchanged content does not rewrite timestamps.

## LinkedIn sources

`content/linkedin-posts.json` is the curated list of public original-post URLs. Add a new original URL there, then run the importer. It fetches only HTTPS public post pages, without cookies, account credentials or private APIs. It requires public JSON-LD with the exact author profile, full `articleBody`, original-post identity and an explicit valid publication timestamp. Other authors, comments, reposts, missing bodies and unverified dates are not imported.

The verified original snapshot is `data/linkedin-posts.json`. Bodies remain the public author's original text, including paragraph breaks. A headline supplies the title; a shortened body excerpt supplies previews. The merged feed uses `{schemaVersion:1, updatedAt, posts:[{id, source, title, publishedAt, url, excerpt, body}]}`. The LinkedIn snapshot also records the canonical public `profileUrl`.

If a known source is unavailable or changes format, its last verified post remains. New local blog posts can still build and the GitHub contribution snapshot can still publish. Source counts and retained/failure status belong in the private desktop publisher journal, not extra homepage panels. Previously verified originals are not silently deleted because a registry URL disappears. A deliberate retirement requires an explicit edit of the registry and verified snapshot, followed by rebuilding the merged feed.

## Automatic refresh and limits

The existing model-free desktop publisher job `9801c063-df88-4b92-91d2-3b840caffaab` is the only recurring owner. Once the updated source is deployed and verified through an actual native run, its existing 07:15 `America/Chicago` schedule revalidates curated post URLs, rebuilds local posts and publishes meaningful changes to the three exact public data paths. It does not rewrite posts, change project content, run on the laptop or create a second schedule. Normal success is quiet. The private journal records runtime identity and source status. Main-only publishing, deploy-key auth, per-path pending hashes, normal retry pushes and user-file preservation remain enforced.

On October 26, 2026, both supplied public post pages were accessible without authentication and their public JSON-LD author, full text and publication dates were verified on ABHIONEMILLION. The canonical profile and recent-activity index returned HTTP 999. Therefore this is automatic sorting, merging and revalidation of known URLs, not automatic discovery of future LinkedIn posts. Add future original URLs to the registry until an approved, reliable discovery source exists. Do not retry around blocks, export browser cookies, call private Voyager endpoints or bypass challenges.

LinkedIn's [official Posts API documentation](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api) requires approved restricted `r_member_social` access to retrieve member posts. Its [Community Management documentation](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview) describes the application approval requirement. An ordinary public profile URL is not that permission.
