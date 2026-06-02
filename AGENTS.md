<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This repo uses Next `16.2.7` with React `19.2.4`. Read the matching guide in `node_modules/next/dist/docs/` before changing framework behavior; APIs and conventions differ from older Next.js releases.
<!-- END:nextjs-agent-rules -->

## Verify

- Use `npm`; the lockfile is `package-lock.json`.
- Main checks are `npm run lint` then `npm run build`. There is no separate `test` or `typecheck` script.
- `npm install` runs `prisma generate` via `postinstall`.

## Structure

- App runtime code is under `src/`; App Router entrypoints live in `src/app/`.
- Database wiring lives in `prisma/` and `src/lib/prisma.ts`.
- `.agents/`, `.opencode/`, and `skills-lock.json` are agent tooling, not app runtime. Scope app searches to `src/`, `prisma/`, `public/`, and `docs/` unless the task is about agent assets.

## Prisma And Env

- Prisma uses `provider = "prisma-client-js"` and a single datasource env: `DATABASE_URL`. There is no `DIRECT_URL`.
- Reuse `@/lib/prisma` for DB access. Prisma-backed route handlers should stay on `runtime = "nodejs"`; see `src/app/api/health/db/route.ts`.
- `npm run prisma:migrate` is hardcoded to `--name init_connection_test`. For any new migration, run `npx prisma migrate dev --name <descriptive-name>` instead.
- After changing `prisma/schema.prisma`, run `npm run prisma:generate` and verify with a DB-focused check such as `/api/health/db`.
- `.env*` files are gitignored except `.env.example`; mirror any new required env vars in `.env.example`.

## Styling

- Tailwind is on v4 via `@tailwindcss/postcss` in `postcss.config.mjs`; there is no `tailwind.config.*` file to edit today.
