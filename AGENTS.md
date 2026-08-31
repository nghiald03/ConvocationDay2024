# AGENTS.md

This file defines the repository-wide rules for AI coding agents. It applies to every file under the repository root unless a more specific nested `AGENTS.md` overrides it.

## Project overview

This repository is a multi-service graduation ceremony check-in system. The active services are:

- `fe/`: Next.js App Router frontend
- `be-nest/`: NestJS backend migration target
- `be/`: legacy .NET backend
- `mobile/`: mobile client
- `imageAPI/`: image service

The frontend in `fe/` uses:

- Next.js and React with strict TypeScript
- Bun as the only package manager and script runner
- Tailwind CSS and shadcn/ui
- TanStack Query for server state
- Zustand for shared client-only state
- Axios for HTTP requests
- `next-themes` for light/dark mode
- Montserrat through `next/font/google` as the default font

## Required commands

- Use `bun install` to install the lockfile.
- Use `bun add <package>` and `bun add -d <package>` for dependencies.
- Use `bunx --bun <command>` for package executables.
- Never use npm, pnpm, Yarn, `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`.
- Keep `bun.lock` synchronized whenever dependencies change.

## Architecture

At the repository root, keep service code inside its owning service directory:

```text
fe/          # Next.js frontend
be-nest/     # NestJS backend
be/          # legacy .NET backend
mobile/      # mobile client
imageAPI/    # image service
scripts/     # repository-level automation
```

Inside `fe/`, organize product behavior by feature:

```text
fe/src/
|-- app/             # Routes, layouts, route handlers, app-level providers
|-- components/ui/   # shadcn/ui primitives
|-- features/        # Product feature modules
|   `-- <feature>/
|       |-- api/     # Feature-owned HTTP operations
|       |-- model/   # Types and domain rules
|       |-- queries/ # TanStack Query definitions and hooks
|       `-- ui/      # Feature-owned UI
|-- hooks/           # Truly shared React hooks
|-- lib/             # Shared infrastructure and utilities
`-- stores/          # Shared Zustand stores
```

- Prefer deep modules: expose a small interface and keep implementation details local.
- Do not add an abstraction, adapter, or seam unless behavior genuinely varies or multiple callers benefit from it.
- Keep feature-specific code inside its feature. Move code to `lib`, `hooks`, or `stores` only when it is genuinely shared.
- Import directly from the owning file. Do not introduce barrel files solely to shorten imports.
- Respect the `@/*` alias for files under `fe/src`.

## Data and state

- Treat remote/server data as TanStack Query state.
- Treat cross-feature, client-only UI state as Zustand state.
- Keep local interaction state in the closest React component when it does not need to be shared.
- UI modules must not call Axios directly.
- Put the shared Axios instance and transport concerns in `fe/src/lib/http`.
- Put each endpoint operation in its owning feature's `api` directory.
- Put query keys and query/mutation definitions in the feature's `queries` directory.
- Return typed response data from HTTP functions and preserve `unknown` at error boundaries until it is narrowed.

## Next.js and React

- Prefer Server Components. Add `"use client"` only where browser APIs, state, effects, context, or event handlers require it.
- Keep client boundaries as small as practical; do not turn layouts or pages into Client Components without need.
- Use `next/font` for fonts and `next/image` for application images where applicable.
- Avoid sequential awaits for independent work; execute independent operations concurrently.
- Do not create effects for values that can be derived during render.
- Use `useSyncExternalStore` for subscriptions to external browser state.
- Subscribe to the smallest Zustand slice needed by a component.
- Avoid impure operations such as `Math.random()` or `Date.now()` during render.

## UI and styling

- Reuse primitives from `fe/src/components/ui` before creating new primitives.
- **Do not hand-roll** a primitive that already exists on the shadcn registry. Add or refresh with `bunx --bun shadcn@latest add <component>`.
- Agent-facing short form: `CLAUDE.md`.
- Preserve Neutral admin tokens in `fe/src/app/globals.css` (zinc/white canvas, bronze sole accent). Palette authority: `design.md`. Do not treat leftover `--navy`/`--beige` aliases as the live palette.
- Style with semantic utilities such as `bg-background`, `text-foreground`, `bg-primary`, and `text-primary-foreground` instead of hard-coded colors.
- Custom brand utilities such as `text-bronze` are allowed for explicitly branded surfaces.
- Every visual change must work in both light and dark mode.
- Preserve visible keyboard focus, accessible names, semantic HTML, and reduced-motion behavior.
- Montserrat is the default font through the `font-sans` Tailwind token; do not add a competing global `font-family`.

### Mandatory color contrast workflow

Every change to a theme color, semantic color token, brand color, component color, opacity, gradient, or state color must be contrast-checked **before editing the code**.

1. Identify every affected foreground/background pair in both light and dark mode.
2. Measure the current contrast ratio to establish a baseline before changing any value.
3. Check the proposed values before applying them. Do not rely on visual judgment alone.
4. Check all applicable states: default, hover, focus, active, selected, disabled, destructive, and text placed on cards, popovers, dialogs, sidebars, or gradients.
5. Apply the change only when the proposed pairs meet the required thresholds.
6. Re-run the same contrast checks after editing and report the measured before/after ratios in the final response.

Required WCAG thresholds:

- Normal text and text inside controls: at least `4.5:1`.
- Large text (at least 24px regular or 18.66px bold): at least `3:1`.
- Meaningful icons, focus indicators, borders, and UI controls: at least `3:1` against adjacent colors.
- Disabled controls are exempt from WCAG contrast requirements, but must remain legible and visibly distinguishable from enabled controls.

Additional constraints:

- Never use opacity as the only hover treatment when it makes contrast depend on the surface behind the element.
- Gradients must pass at their lowest-contrast point, not only at their average or endpoints.
- A token change is not complete until every known consumer of that semantic token has been considered.
- If an automated contrast check cannot evaluate a color expression, explain the limitation and verify it with a browser accessibility tool before claiming completion.

## File naming conventions

Use lowercase `kebab-case` for repository file and directory names unless a framework or tool requires an exact name.

### Files

- React modules: `feature-name.tsx`, for example `health-status.tsx` and `theme-toggle.tsx`.
- Hooks: `use-feature-name.ts` or `use-feature-name.tsx`; the exported hook must start with `use`.
- Zustand stores: `use-feature-store.ts`; export `useFeatureStore`.
- TanStack Query hooks: `use-resource-query.ts` and `use-action-mutation.ts`.
- HTTP operations: verb-first names such as `get-user.ts`, `create-order.ts`, `update-profile.ts`, and `delete-session.ts`.
- Domain models and schemas: singular domain names such as `user.ts`, `order.ts`, or `profile-schema.ts`.
- Utilities: behavior-oriented names such as `get-error-message.ts` or `format-currency.ts`.
- Tests: colocate as `<source-name>.test.ts` or `<source-name>.test.tsx`.
- Stories, when present: `<source-name>.stories.tsx`.
- Do not create vague files such as `helpers.ts`, `common.ts`, `misc.ts`, `types.ts`, or `utils.ts` inside feature modules. Name files after the behavior or concept they own. The existing shared `fe/src/lib/utils.ts` is the shadcn compatibility exception.

### Directories

- Feature directories use singular domain-oriented names when the module represents one concept, for example `features/health` or `features/profile`.
- Route directories follow Next.js URL conventions and may use `[id]`, `(group)`, `@slot`, or other App Router syntax.
- Keep the standard feature subdirectories named `api`, `model`, `queries`, and `ui`.
- Do not create a directory that contains only one pass-through file unless the framework requires it or it establishes a proven seam.

### Required-name exceptions

Preserve exact names required by the ecosystem, including:

- Next.js: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, `route.ts`, `template.tsx`, `default.tsx`, `middleware.ts`, and `instrumentation.ts`.
- Repository/tooling: `AGENTS.md`, `README.md`, `SKILL.md`, `Dockerfile`, and tool-specific configuration filenames.
- Environment files: `.env`, `.env.local`, `.env.example`, and other supported `.env.*` variants.

When adding a file, its name must communicate its owning concept and primary behavior without requiring the reader to open it. Renaming an existing public or framework-owned file requires updating all imports and references in the same change.

## TypeScript and code quality

- Keep TypeScript strict. Do not use `any` unless an external type makes it unavoidable and the reason is documented.
- Prefer precise types and discriminated unions over type assertions.
- Keep functions focused, but do not split code into shallow pass-through modules.
- Do not suppress ESLint or TypeScript errors globally to make generated code pass.
- When modifying generated shadcn files, keep changes minimal and preserve their public interface unless the task explicitly requires an interface change.
- Do not edit unrelated files or overwrite user changes.

## Validation

Before completing a code change, run the checks relevant to its risk. For normal source changes, run all three:

```bash
bun run lint
bun run typecheck
bun run build
bun run secrets:check
```

If a check cannot run, report the exact command, failure, and remaining risk. Do not claim completion with known lint, type, or build failures.

## Environment and secrets

- Document public environment variables in `.env.example`.
- Never commit `.env.local`, credentials, tokens, or private endpoints.
- Only expose browser-safe values with the `NEXT_PUBLIC_` prefix.
- Never hard-code credentials. Run `bun run secrets:check` before committing or pushing security-sensitive changes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
