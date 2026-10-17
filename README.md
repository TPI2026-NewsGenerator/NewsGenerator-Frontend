# NewsGenerator-Frontend

## Description

It is a personalizable news generator. <br>
The reader writes in their own words what they want to read, or lets the AI ask them a few questions
and write it; the AI reads interests in it, and the server reads the news of the sources found for
them and of the ones every reader added. The pages:

- **Briefing** (`/briefing`, the home page): written on demand, the stories of the last 1 to 7 days
  (a bar, 2 days by default) closest to the profile, 10, 20 or 30 cards. Each card has its key
  sentences as published, read as bullet points, a summary of 5 to 6 lines or the key passages, why
  it was chosen, the media that tell it and how many of them wrote their own text, who it credits,
  who denies it, other angles of the same affair, the posts where a party said it itself (official
  sources), the people and organisations it is about, and a thumb to vote. On demand: the
  original of a translated card, the AI's own version of the points or the summary, and the AI
  analysis of the cards that need one (why it matters, what could come next, the story so far),
  written a minute or more after the cards. A small "i" explains each label. When the profile
  follows names, a second tab, **Following**, lists every news of the sources naming one;
- **Following** (`/following`): the clubs, people and organisations the profile follows, found in
  Wikidata, and the names or words followed as written; the names met on several cards are
  suggested. Each has a page of its news (`/following/:qid`, with the news of what it is linked to,
  `/following/name/:name` for a name as written), over a window of 1 to 7 days;
- **Search** (`/search`): the news of a sentence, by its meaning, or of exact words (quotes, commas,
  `-word`), saved searches, and the key passages of up to ten news chosen;
- **Profile** (`/profile`): the profile in the reader's own words, its language, the interests the
  AI read in it (corrected, made main or secondary, removed), what it leaves out, its projects for a
  time, then its sources: one list of the ones found for it, the ones added and the ones left out,
  each trusted (a star), removed or brought back, and the ways to add some (a website, a search of
  the directory and the web, a file of sites, the sources recommended);
- **Settings** (`/settings`): the username, the e-mail and the password of the account, each changed
  with the current password;
- **Login** and **Register** (`/login`, `/register`): the account is created with its profile, and
  the sources of its briefing are searched at once. The link to the signup is shown only while the
  server opens it (`SIGNUP_OPEN=1` on the server).

The AI never writes the text of a card: the key passages, the points and the summary are the
article's own sentences, the AI only chose them, and a translated one is marked as such. Only the
"AI version", shown on demand under them, is written by the AI, and says so.

What the administrators can do (the role `Admin`, read by the server at each request) is shown to
them only: the server answers `admin` in `GET /api/session` and `mail` in `GET /api/briefing`.

- **the e-mail of the briefing**: the cards ticked are sent to an address, the one of the account
  written in already. In the bar at the foot of the page, before sending: their order, their title,
  their picture (another of the story, none, the address of an image, a file of theirs), the way
  their sentences are shown, the AI version of a card, and the lines of the analysis, the denials,
  the other angles and the official sources to leave out. A story sent counts as read: the
  briefings of the next 48 hours leave it out unless something new happened;
- **a news added by its link** at the end of the briefing, for the e-mail;
- **several profiles** ("Work", "Leisure"), each with its interests, sources, projects and briefings,
  chosen in the masthead. A reader who has several (made before) can still switch, rename and delete
  them.

What the search page shows, beyond the news themselves:

- **how widely a news is carried**: how many media tell it, and how many of them wrote their own
  text rather than republishing a wire. It says what was counted, never that the news is true.
  Above ten articles the card says `N media on this story` instead: a group that large is a running
  story followed from several angles, not one news confirmed that many times;
- **the words the article used to hedge** (`says "reportedly"`), when it has any;
- **the facts of one affair** in their order (the preview, the result, the reactions), each of them
  can be chosen for its key passages;
- **the media this search missed**, read from Google News and GDELT: their news for reading only,
  and next to them their feeds, added in one click;
- the **wider search** offered when asking for every word at once found almost nothing.

The filter panel of the results filters on these measurements too: keeping only the news several
media carry, only those where each medium wrote its own wording, only the ones a single source has,
or only the articles that used one of the hedging words; the list of words offered is built from the
results themselves.

The reader chooses one language per profile (English, French, Spanish, German or Italian): the
search and the briefing read the news of every language, and the titles and sentences written in
another one are translated into it, the original shown on demand. In the search, a card is
translated when it comes near the screen, a few cards in one request.

Every reader's sources are read for every briefing and every search: the ones listed on the profile
are the ones this reader looks after.

The last search is kept in the browser for a day, with its news, key passages and translations, for
that reader only, and forgotten at the sign out. The browser also keeps the profile chosen, the
number of cards and the way of reading. The session is a cookie the page cannot read: the page asks
the server who is signed in when it opens.

## Tech Stack

* [React](https://react.dev/) [v19.2] with [React Router](https://reactrouter.com/) [v7.14], built by [Vite](https://vite.dev/) [v7.3] (`@vitejs/plugin-react` v5.1)
* [Tailwind CSS](https://tailwindcss.com/) [v4.2], and components of [shadcn](https://ui.shadcn.com/) [v4.2] on [Radix](https://www.radix-ui.com/) [v1.4] (`src/components/ui`); icons of [lucide](https://lucide.dev/) [v1.8] and [react-icons](https://react-icons.github.io/react-icons/) [v5.6]
* Fonts Fraunces and Source Serif 4 ([Fontsource](https://fontsource.org/), v5.3)
* [fflate](https://github.com/101arrowz/fflate) [v0.8.3], to read the Excel files of sites imported, in the browser
* Tests: [Vitest](https://vitest.dev/) [v4.0] with [Testing Library](https://testing-library.com/) (React v16.3) and [jsdom](https://github.com/jsdom/jsdom) [v28.1]
* Linter: [ESLint](https://eslint.org/) [v9.39]

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) [v24.21.0]
* IDE used: [IntelliJ](https://www.jetbrains.com/idea/) [v2025.3.3]
* Package manager: [pnpm](https://pnpm.io/fr/) [v10.33.2]
* OS supported: All (web based)

### Configuration

#### Environment

To install the dependencies:

```bash
pnpm install
```

Create a `.env` file in the root folder, like `.env.example`:

| Variable | What it is |
|---|---|
| `VITE_API_URL` | the address the page calls the API at, `/api`: its own address, so the session cookie is of the site |
| `API_TARGET` | where the dev server of Vite sends `/api` (`vite.config.js`): `http://localhost:3001` for the server of this machine, or the API of the Ubuntu server (see `server/README.md`). `http://localhost:3001` when not set |
| `REACTBITS_LICENSE_KEY` | only for the shadcn CLI, to add components of React Bits Pro (`components.json`); the build does not use it |

```
VITE_API_URL=/api
API_TARGET=http://localhost:3001
```

The page never sees the token of the session: Vite here, Caddy once deployed, give the API on the
page's own address.

To start a development server:

```bash
pnpm run dev
```

It starts the frontend (Vite, port 5173), the backend of `../server` (nodemon, port 3001) and its
embedder (`python embedder/server.py`) together. The backend needs its own `pnpm install` and its
`.env`, the embedder its Python packages (see `server/README.md`).
To start the frontend alone, against the server `API_TARGET` names:

```bash
pnpm run dev:client
```

To run the tests (`tests/`), once or on each change:

```bash
pnpm vitest run
```

```bash
pnpm test
```

And the linter:

```bash
pnpm run lint
```

## Deployment

To build for production:

```bash
pnpm run build
```

`server/deploy/deploy.sh` builds the client itself (`VITE_API_URL=/api pnpm --dir ../client run build`),
checks that Git Bash did not turn `/api` into a path of Windows, and copies `dist/` to
`~/newsgenerator/client-dist` on the server. There Caddy (`server/deploy/Caddyfile`, the container
`web` of `compose.yml`) serves it from `/srv`: `/api/*` is sent on to the API, the files of
`/assets/` are kept a year by the browser (their names change with their content), the page itself
is asked each time, and every other address (`/briefing`, `/profile`...) answers `index.html`.
See `server/README.md`.

## Directory structure

```shell
|-- docs                             # README.md says what each folder holds (see Documentation)
|   |-- accounts, search, profile, briefing, following
|   |                                # one folder per feature: its pages and components, its sequences
|   |-- Archive                      # the use cases planned at sprint 1 and their sprints 1-3, the dropped "last filter"
|   |-- design-mock                  # the mockups of the first sprints, before the editorial redesign
|   |-- use-cases
|   `-- _style                       # the style the diagrams include
|-- public                           # icons, the manifest and the picture of a shared link
|-- src
|   |-- App.jsx                      # the routes of the pages
|   |-- main.jsx                     # the router and the session around the app
|   |-- components
|   |   |-- layout                   # the frame of a page: masthead, opening spread, sections, colophon
|   |   |-- news                     # the links of a news, its language, the terms followed marked in a text
|   |   `-- ui                       # buttons, fields, dialogs and toasts, the small "i", list filter, scroll area
|   |-- features
|   |   |-- auth                     # the signed in reader, asked to the server once, and the settings calls
|   |   |-- briefing
|   |   |   |-- api                  # briefingApi.js: the briefing and the profile
|   |   |   |-- components           # the card, the window, the size, the way of reading, the analysis,
|   |   |   |                        # what is followed, the e-mail bar, the sources of the profile
|   |   |   `-- *.js                 # windows, sizes, formats, mailPictures, marks, corroboration, importFile...
|   |   |-- custom-search
|   |   |   `-- api                  # the saved searches
|   |   |-- entities                 # entityApi.js: what the profile follows (Wikidata items, names, words)
|   |   |-- login
|   |   |   |-- api                  # login and signup
|   |   |   `-- components           # the frame of the login and signup pages
|   |   |-- navbar
|   |   |   `-- components           # the masthead of every page
|   |   |-- profiles                 # the profile chosen (X-Profile), the switcher, the AI questions, the projects
|   |   `-- search
|   |       |-- api                  # searchApi.js (news, translations, key passages), feedApi.js (sources)
|   |       |-- components
|   |       |   |-- article          # one news card, with how widely it is carried
|   |       |   |-- feed-list        # the results and their filters
|   |       |   |-- source-suggestions   # the media this search missed, and their feeds to add
|   |       |   |-- summary-list     # the key passages of the news chosen
|   |       |   `-- thread-timeline  # the facts of one affair, in their order
|   |       |-- keptSearch.js        # the last search, kept a day in the browser
|   |       `-- translation.js       # the cards in another language translated when reached
|   |-- lib                          # cn(), toasts
|   |-- pages                        # Briefing, Following, Entity, Name, Search, Profile, Settings, Login, Signup
|   `-- styles                       # Tailwind and the tokens of the editorial design
`-- tests                            # Vitest + Testing Library, one file per feature
```

## Documentation

The documentation of the client and of the server is one site, built from `server/` (`pnpm run docs`, see
the README of the server): this folder is its part "Client". Every tool and its version is in
`server/docs/tools.md`.

The diagrams are in `docs/`, one folder per feature, as the ones of the server (`docs/README.md` says what
each holds), as source and as PNG next to it. Render a folder again, from `client/`, with
`java -jar plantuml.jar -charset UTF-8 "docs/briefing/*.puml"`. The class and sequence diagrams of the client
include `docs/_style/class.iuml` and `sequence.iuml`; a box is a React component, a hook or a module of
`src/`, and the server is one box, its routes listed on it. Each part of a feature (Briefing > Summary (IA),
Search > Key passages...) is documented from the click to the database in its folder of `server/docs/`; the
server's own diagrams, its database and the walk of the whole system from A to Z are there too.

| File | What |
|---|---|
| `use-cases/use-case-diagram.puml` | the use cases as they stand (16.10.2026), in French, Invité, Membre and Administrateur, on two pages: `use-case-diagram.png` (account, profiles, sources) and `use-case-diagram_001.png` (search, briefing, e-mail, following). Its header lists what changed since the planned scope |
| `archive/use-case-diagram-planned.puml` | the use cases planned at sprint 1, kept as they were, with the PNG of sprints 1 to 3 |
| `accounts/client-01-accounts.puml` | class diagram: login, signup, the session, the settings |
| `search/client-02-search.puml` | class diagram: the search, its translations, the key passages, the saved searches |
| `profile/client-03-profiles.puml` | class diagram: the profiles, the AI questions, the interests, the projects, the sources |
| `briefing/client-04-briefing.puml` | class diagram: the briefing page and its card |
| `briefing/email/client-05-email.puml` | class diagram: the e-mail bar (MailBar, MailAside, MailPicture, mailPictures) |
| `following/client-06-following.puml` | class diagram: what a profile follows and the page of a name |
| `briefing/client-20-briefing-sequence.puml` | sequence: the briefing opened, started, followed every 3 s (8 s for its analysis), voted |
| `briefing/email/client-21-email-sequence.puml` | sequence: cards ticked, edited in the bar, sent |
| `accounts/login-sequence-diagram.puml`, `login_get_user-sequence-diagram.puml`, `login_logout-sequence-diagram.puml` | sequences, in French: the login, the reader asked when the app opens, the sign out |
| `search/saved-searches/search-history-diagram_*.puml` | sequences, in French: a saved search created or replaced, loaded, deleted |
| `archive/user-preferences-diagram.puml` | the "last filter" of sprint 1, dropped: kept as it was planned, its header says what replaced it |

## Collaborate

If you have a suggestion that would make this better,
please fork the repo and create a pull request.
You can also simply open an issue with the tag "enhancement". More info on
[how to commit](https://www.conventionalcommits.org/en/v1.0.0/) and [how to use my workflow](https://nvie.com/posts/a-successful-git-branching-model/)

**Propose new feature:**

1. Fork the Project
2. Create your Feature Branch (git checkout -b feature/AmazingFeature)
3. Commit your Changes (git commit -m 'Add some AmazingFeature')
4. Push to the Branch (git push origin feature/AmazingFeature)
5. Open a Pull Request

## License

This project is under [MIT License](https://en.wikipedia.org/wiki/MIT_License). See more under `LICENSE`

## Contact

Can contact me on discord: fab2y
