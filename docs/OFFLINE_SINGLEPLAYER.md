# Offline single-player

This branch can run Duelyst without Firebase, PostgreSQL, Redis, the API server,
the game server, or a worker process.

## First run

Install the workspace dependencies, build the offline client, and start its
local web server:

```powershell
corepack yarn workspaces focus
corepack yarn offline
```

The launcher opens `http://127.0.0.1:3000` in the default browser. Keep the
terminal open while playing and press `Ctrl+C` to stop it.

After the first build, start the existing build more quickly with:

```powershell
corepack yarn start:offline
```

Use a different port if 3000 is occupied:

```powershell
corepack yarn start:offline --port 3001
```

## Included in the first offline version

- automatic local-player login;
- Practice mode with the full-strength client-side Starter AI and its complete
  40-card faction decks;
- Challenges and Sandbox; the built-in training category stays available but
  optional, while offline Challenges bypass retired tutorial and online-match
  prerequisites and still save attempts and completions;
- all collectible base cards available for local deck building;
- Simplified Chinese for the offline menus, deck builder, cards, rules,
  challenges, and battle UI;
- locally persisted decks, settings, profile data, and challenge progress;
- online-only matchmaking, spectating, crates, and store surfaces hidden.

Browser storage is the save file for this version. Use the same browser,
profile, and port to retain progress. Clearing site data for the matching
`127.0.0.1:<port>` origin deletes that port's local save.

## Rebuild after source changes

```powershell
corepack yarn build:offline
```

The normal online build remains available through `corepack yarn build`.

## Windows installer

Build a 64-bit Windows installer from the offline client:

```powershell
corepack yarn build:installer
```

The command creates a minified release build and writes the NSIS setup
executable to `dist/installer`. The installed desktop app keeps its save data
across upgrades and normal uninstalls. The installer is not code-signed, so
Windows may identify it as coming from an unknown publisher.

The desktop app uses its own save area under `%APPDATA%\Duelyst Offline`; it
does not automatically import the browser version's save. Press `F11` or
`Alt+Enter` to toggle full screen.

The client follows the Windows display language on first launch. You can also
switch between English and Simplified Chinese from **Settings > Language**;
restart the game after changing the language.

Player-facing text and long-form lore follow the repository conventions in
[`LOCALIZATION.md`](LOCALIZATION.md). New copy should be added to locale
resources instead of being written directly in templates or source code.

The Codex world-map labels are painted directly into the original JPG artwork.
They remain English until dedicated `zh-cn` map assets are produced; this is an
image-localization task rather than a missing locale key.
