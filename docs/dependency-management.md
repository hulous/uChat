# Dependency management

## Reproducible installs

The frontend and E2E projects are independent npm projects. Their committed
`package-lock.json` files are authoritative: CI, Docker builds, and Docker-backed
test and lint targets use `npm install`, never `npm ci`. Changes to
`package.json` must be accompanied by the matching lockfile update.

## Auditing dependencies

The CI workflow does not currently run dependency audits. Run the relevant
package or Maven audit locally when changing dependencies, and triage any
reported issue before merging. Audit failures should be treated as
release-blocking until triaged.

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
4. Revisit every suppression during subsequent dependency changes or audits and
   remove it as soon as a supported fix is available.

The JJWT modules are kept on the same version. They are currently pinned to
0.13.0, which supersedes the previously used 0.11.5 line; upgrades must be
verified against current Maven advisories before merging.
