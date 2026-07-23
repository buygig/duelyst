## Summary

Describe the player-visible result and the implementation boundary.

## Areas changed

- [ ] Offline UI or navigation
- [ ] Game rules, cards, challenges, or AI
- [ ] Local save/API/Firebase-compatible adapters
- [ ] Localization or lore
- [ ] Build, resources, or installer
- [ ] Tests or documentation

## Verification

- [ ] `corepack yarn test:offline`
- [ ] `corepack yarn build:offline`
- [ ] A practice game can start, finish, and return to the main menu.
- [ ] A challenge can start and save completion.
- [ ] The changed flow works after restarting the browser or desktop app.
- [ ] New player-facing text is stored in localization resources.
