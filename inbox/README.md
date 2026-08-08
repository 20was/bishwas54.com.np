# Inbox

Drop raw notes here (any text/markdown file) and push to `main`. A GitHub
Action hands the note to Claude, which opens a **draft PR** with a
structured post. Review it, answer the inline questions, add your own
experience, flip `draft: false`, and merge to publish.

The workflow can also be run manually from the Actions tab with pasted
text (`Draft from inbox` → Run workflow).

Requires the `ANTHROPIC_API_KEY` repository secret.
