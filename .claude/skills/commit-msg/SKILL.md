---
name: commit-msg
description: Generate a conventional commit message from staged changes and commit them. Use when the user says "write a commit message", "generate a commit", "commit my changes", or runs /commit-msg.
---

# commit-msg

Generate a conventional-commit message from the currently staged changes and create the commit.

## Workflow

1. **Check for staged changes.** Run `git diff --staged --stat`. If the output is empty (nothing staged), **stop immediately** and tell the user: "Nothing is staged. Stage your changes first (e.g. `git add ...`), then try again." Do not stage anything yourself.

2. **Read the staged diff.** Run `git diff --staged` and read it fully to understand what changed and why.

3. **Generate the message** in this exact format:

   ```
   type(scope): short subject

   - bullet of what changed
   - bullet of why
   ```

   - **type** — one of: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`. Pick the one that best matches the dominant change.
   - **scope** — a short area name derived from the diff (e.g. the app, module, or folder touched, like `backend`, `whatsapp`, `web`). Keep it lowercase and concise.
   - **subject** — imperative mood, **under 60 characters**, no trailing period.
   - **body bullets** — optional but encouraged. First bullet says *what* changed; a second says *why*. Add more only if genuinely useful.

4. **Commit.** Run `git commit` with the generated message (use multiple `-m` flags or a HEREDOC so the body formats correctly).

## Rules

- **Never** include a `Co-Authored-By` trailer or any other trailer.
- Do not add files to the index — only commit what is already staged.
- If the subject would exceed 60 characters, tighten it; don't overflow.
