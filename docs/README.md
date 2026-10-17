# Documentation of the client

Where to start: **[`use-cases/use-case-diagram.png`](use-cases/use-case-diagram.png)** (in French),
what a guest, a member and an administrator can do, then
[`use-case-diagram_001.png`](use-cases/use-case-diagram_001.png). How the whole system works, from A to Z,
is told in [`server/docs/a-to-z/parcours-newsgenerator.md`](../../server/docs/a-to-z/parcours-newsgenerator.md).

The folders follow the features of [`server/docs/`](../../server/docs/README.md). Here are the client's side of
each: its pages, components, hooks and API modules (class diagrams, `client-0x`) and what a page does and asks the
server (sequence diagrams, `client-2x` and the ones of sprint 1, in French). The part of a feature (Briefing >
Summary (IA), Search > Key passages…), from the click to the database, is documented in its folder of
`server/docs/`, its sequence diagram starting at the React component.

| Folder | What |
|---|---|
| `use-cases/` | the use cases of today (16.10.2026), on two pages: [account, profiles, sources](use-cases/use-case-diagram.png), [search, briefing, e-mail, following](use-cases/use-case-diagram_001.png) |
| `accounts/` | [`client-01-accounts`](accounts/client-01-accounts.png): login, signup, the session, the settings; the sequences of [the login](accounts/login-sequence-diagram.png), of [the reader asked when the app opens](accounts/login_get_user-sequence-diagram.png), of [the sign out](accounts/login_logout-sequence-diagram.png) |
| `search/` | [`client-02-search`](search/client-02-search.png): the search, its translations, the key passages; `saved-searches/`: their sequences, [created or replaced](search/saved-searches/search-history-diagram_create_mod.png), [loaded](search/saved-searches/search-history-diagram_get.png), [deleted](search/saved-searches/search-history-diagram_delete.png) |
| `profile/` | [`client-03-profiles`](profile/client-03-profiles.png): the profiles, the AI questions, the interests, the projects, the sources |
| `briefing/` | [`client-04-briefing`](briefing/client-04-briefing.png): the page and its card; [`client-20-briefing-sequence`](briefing/client-20-briefing-sequence.png): started, followed every 3 s (8 s for its analysis), voted |
| `briefing/email/` | [`client-05-email`](briefing/email/client-05-email.png): the e-mail bar; [`client-21-email-sequence`](briefing/email/client-21-email-sequence.png): cards ticked, edited, sent |
| `following/` | [`client-06-following`](following/client-06-following.png): what a profile follows and the page of a name |
| `design-mock/` | the mockups of the first sprints, before the editorial redesign |
| `archive/` | the use cases planned at sprint 1 and their PNG of sprints 1 to 3; the "last filter", dropped |
| `_style/` | the style every class (`class.iuml`) and sequence (`sequence.iuml`) diagram includes |

Render the diagrams of a folder again, from `client/`:

```bash
java -jar plantuml.jar -charset UTF-8 "docs/briefing/*.puml"
```
