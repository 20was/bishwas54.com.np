# Inbox

Raw-note drop zone. Studying something anywhere? Dump your rough notes
here as a text/markdown file (or just paste them into chat), open Claude
Code in this project, and say:

> make a note from inbox/whatever.md
> — or —
> turn this into a tutorial: <pasted notes>

Claude drafts the post following the `new-post` skill (beginner-friendly
style, schema-correct frontmatter, quiz for tutorials, no invented
facts), shows it to you for review, and publishes only after you approve.
The processed inbox file gets deleted.

No API keys, no GitHub Actions — your Claude Code session does the work.
