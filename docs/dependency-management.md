# Dependency management

## Reproducible installs

The frontend and E2E projects are independent npm projects. Their committed
`package-lock.json` files are authoritative: CI, Docker builds, and Docker-backed
test and lint targets use `npm install`, never `npm install`. Changes to
`package.json` must be accompanied by the matching lockfile update.

## Automated checks

Pull requests and the weekly scheduled workflow run:

- `npm audit --audit-level=high` for the frontend and E2E lockfiles
- OWASP Maven Dependency-Check for backend dependencies, failing at CVSS 7.0
  or higher
- GitHub Dependency Review on pull requests, failing on high-severity changes

Audit failures are release-blocking until triaged. The scheduled run catches
new advisories even when the repository has not changed.

## Triage, suppressions, and upgrades

When an audit reports a dependency:

1. Confirm the advisory, affected dependency path, severity, and whether a
   patched release exists.
2. Upgrade the direct dependency or use the package manager's supported
   override mechanism for a transitive npm dependency. Regenerate and commit
   the lockfile, then rerun the relevant audit and tests.
3. If no fix is available, or an upgrade requires a planned breaking change,
   record the advisory, affected path, rationale, owner, and review date in the
   pull request. Use the narrowest available suppression and set an expiry;
   suppressions must not be permanent or conceal a high/critical issue without
   explicit maintainer approval.
4. Revisit every suppression during the weekly scheduled audit and remove it
   as soon as a supported fix is available.

The JJWT modules are kept on the same version. They are currently pinned to
0.13.0, which supersedes the previously used 0.11.5 line; upgrades must be
verified against current Maven advisories before merging.
