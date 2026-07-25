# Release handoff rule

Whenever an Android App Bundle is created for Play Console, always provide the user with
copy/paste-ready release notes in the final response. The notes must be tailored to that release,
use short user-facing lines without blank lines or Markdown, include opening and closing language
tags such as `<en-US>` and `</en-US>`, and avoid implementation details. Also save the same notes as a
versioned Markdown file in `release-notes/` using the AAB version and version code in its name.
