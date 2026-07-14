# Repository Guidelines

## Project Structure & Module Organization

This is a React Native mobile app targeting Android. The main entry points are
`index.js` and `src/app.ts`. Application code lives under `src/`: reusable UI in
`src/components`, screens in `src/screens`, navigation setup in
`src/navigation`, state in `src/store`, shared utilities in `src/utils`, runtime
configuration in `src/config`, themes in `src/theme`, and static app resources
in `src/resources`. Native Android files and Gradle configuration are in
`android/`. Documentation and planning notes live in `doc/` and `docs/`.

## Build, Test, and Development Commands

- `npm install`: install dependencies and run the postinstall patch script.
- `npm run start`: start Metro with the experimental debugger enabled.
- `npm run sc`: start Metro with cache reset.
- `npm run dev`: build and run Android on a connected device or emulator using
  the active architecture only.
- `npm run pack:android:debug`: create a debug Android build.
- `npm run pack:android`: create a release Android build.
- `npm run clear`: run Gradle clean in `android/`.
- `npm run build:theme`: regenerate theme assets from `src/theme/themes`.

## Coding Style & Naming Conventions

Use TypeScript/JavaScript with the existing React Native patterns. The project
uses 2-space indentation, LF endings, UTF-8, final newlines, and trimmed trailing
whitespace via `.editorconfig`. Prettier settings require single quotes, no
semicolons, bracket spacing, trailing commas where valid in ES5, and a
100-character print width. Prefer the `@/*` path alias for imports from `src`.
Name React components with PascalCase and hooks/utilities with camelCase.

## Testing Guidelines

There is no dedicated `npm test` script in this repository. Validate changes by
running TypeScript checks when relevant, starting Metro, and exercising affected
Android flows on an emulator or device. For build-sensitive work, run
`npm run pack:android:debug`; for release packaging changes, run
`npm run pack:android`. Keep any new tests or validation scripts close to the
module they cover and document the command in `package.json`.

## Commit & Pull Request Guidelines

Recent history uses concise conventional-style commits with a scoped module and
Chinese description, for example `feat(playDetail): Chinese UI migration summary`.
Use:

```text
feat|fix|chore(module): Chinese task summary
```

Commit only after validation succeeds. Do not add signatures or generated
co-author lines. Pull requests should describe the change, list validation
commands, link related issues, and include screenshots or recordings for UI
changes.

## Security & Configuration Tips

Keep keystores and `android/keystore.properties` out of commits. Avoid committing
generated build outputs, local IDE files, logs, or device-specific configuration.
