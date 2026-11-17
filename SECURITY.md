# Security Policy

## Supported versions

Only the latest commit on the `main` branch is currently supported. This
project does not publish security updates for older commits or unmaintained
branches.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's **Report a
vulnerability** button on the repository's **Security** tab. Private reports
should include:

- a concise description and impact;
- the affected component, version or commit, and configuration;
- clear reproduction steps or a proof of concept;
- any suggested mitigation; and
- whether the issue is known to be exploited.

Do not open a public issue or pull request for an unpatched vulnerability.
Please allow maintainers reasonable time to investigate, coordinate a fix, and
publish any necessary advisory before publicly disclosing the issue.

If private vulnerability reporting is unavailable, open a minimal issue asking
maintainers to enable it; do not include exploit details or sensitive
information.

## JWT storage tradeoff

The frontend stores the JWT in `localStorage` so it can authenticate REST
requests and STOMP connections across page loads. This is vulnerable to token
theft if an attacker executes JavaScript in the application's origin through an
XSS vulnerability. Keep dependencies patched, validate and encode user
content, apply a restrictive Content Security Policy where possible, and never
store other sensitive secrets in browser storage.

