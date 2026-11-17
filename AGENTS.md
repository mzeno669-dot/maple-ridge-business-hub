# Maple Ridge project rules

- Do not deploy or publish without Michael's explicit approval. Acknowledgments of progress do not constitute release approval.
- Keep all estimates, invoices, change orders, and customer messages as drafts. Do not send messages from this project without a specific instruction.
- Preserve the automatic-deployment block in `vercel.json`.
- Never commit customer records, photos, credentials, environment files, or local databases. Import private data separately.
- Do not invent unknown measurements, prices, contact details, scheduling commitments, or payments.
- Run the relevant tests, TypeScript check, and build after substantive changes. Enforce privacy in server handlers, not just the interface.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
