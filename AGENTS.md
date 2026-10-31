# Release handoff rule

Whenever an Android App Bundle is created for Play Console, always provide the user with
copy/paste-ready release notes in the final response. The notes must be tailored to that release,
use short user-facing lines without blank lines or Markdown, include opening and closing language
tags such as `<en-US>` and `</en-US>`, and avoid implementation details. Also save the same notes as a
versioned Markdown file in `release-notes/` using the AAB version and version code in its name.

# Shared Firestore rules (do not deploy from here to production)

`unfiltered-inner-circle` is shared with the RUIC member portal, and a Firebase project has a
single Firestore ruleset. Deploying this repository's `firestore.rules` there would replace the
portal's rules and lock members out of the portal. The authoritative production ruleset lives in
the RUIC repository (`firebase-portal/firestore.rules`) and already includes this app's
`users/{uid}` section; make production tracker rule changes there and deploy them from RUIC.
`firebase.json` is intentionally Hosting-only. Preview rules for `inner-circle-launch-2026` use
`npm run deploy:rules:preview` (`firebase.rules-preview.json`) only.
