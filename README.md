# NewsGenerator-Frontend

## Description

It is a personalizable news generator. <br>
The reader writes in their own words what they want to read; the AI reads interests in it, and the
server reads the news of the sources found for them and of the ones they add. The pages:

- **Briefing** (`/briefing`, the home page): written on demand, up to ten stories of the last 24 hours,
  2 days or 7 days closest to the profile of the reader, each with its key passages as published,
  the media that told it, the affair it belongs to and a thumb to vote; a small "i" explains each
  label of a card;
- **Search** (`/search`): the news of a search, saved searches, and the key passages of the news chosen;
- **Profile** (`/profile`): the profile in the reader's own words, the interests the AI read in it,
  and their sources: one list of the ones found for them and the ones they added, then the ways to
  add some (a website, a feed, a subject, a file of sites, the sources recommended);
- **Settings** (`/settings`): the username and the password of the account;
- **Login** and **Register** (`/login`, `/register`): the account is created with its profile, and the
  sources of its briefing are searched at once.

The AI never writes a summary: the key passages are the article's own sentences, the AI only chose
them, and a translated one is marked as such.

What the search page shows, beyond the news themselves:

- **how widely a news is carried** — how many media tell it, and how many of them wrote their own
  headline rather than republishing a wire. It says what was counted, never that the news is true.
  Above ten articles the card says `N media on this story` instead, as a safety net: a group that
  large is a running story followed from several angles, not one news confirmed that many times;
- **the words the article used to hedge** (`says "reportedly"`), when it has any;
- **the facts of one affair** in their order (the preview, the result, the reactions), each of them
  can be chosen for its key passages;
- **the media this search missed**, read from Google News and GDELT: their news for reading only,
  and next to them the sources that can be added in one click. Those sources are private to the user;
- the **wider search** offered when asking for every word at once found almost nothing.

The filter panel of the results filters on these measurements too: keeping only the news several
media carry, only those where each medium wrote its own wording, only the ones a single source has,
or only the articles that used one of the hedging words — and the list of words offered is built
from the results themselves, so it shows which papers reached for them.

The reader chooses one language to read in (English, French, Spanish, German or Italian): the search
and the briefing read the news of every language, and the titles and key passages written in another
one are translated into it, the original title shown under its translation.

The last search is kept in the browser for a day, with its news, key passages and translations.
The session is a cookie the page cannot read: the page asks the server who is signed in when it opens.

## Tech Stack

* [React.js](https://reactjs.org/) [v19.2] with [React Router](https://reactrouter.com/) [v7.14], built by [Vite](https://vite.dev/) [v7.3]
* [Tailwind CSS](https://tailwindcss.com/) [v4.2] and components of [shadcn](https://ui.shadcn.com/) on [Radix](https://www.radix-ui.com/) (`src/components/ui`), icons of [lucide](https://lucide.dev/) and [react-icons](https://react-icons.github.io/react-icons/)
* Fonts Fraunces and Source Serif 4 ([Fontsource](https://fontsource.org/))
* Tests: [Vitest](https://vitest.dev/) [v4.0] with [Testing Library](https://testing-library.com/) and jsdom

## Getting Started

### Prerequisites

List all dependencies and their version needed by the project as :

[//]: # (* DataBase Engine &#40;MySql, PostgreSQL, MSSQL,...&#41;)
* [Node.js](https://nodejs.org/) [v24.21.0]
* IDE used: [IntelliJ](https://www.jetbrains.com/idea/) [v2025.3.3]
* Package manager: [pnpm](https://pnpm.io/fr/) [v10.33.2]
* OS supported: All (web based)

[//]: # (* Virtualization &#40;Docker, .Net, .JDK, .JRE&#41;)

### Configuration
#### Environment
To install dependencies:

```bash
pnpm install
```

- Create an `.env` file such as the `.env.example` example file in `root` folder. The page calls the
  API on its own address, and Vite sends it on to the server of `API_TARGET` (`vite.config.js`), as
  Caddy does once deployed: the session is a cookie of the site, the page never sees the token.
```
VITE_API_URL=/api
API_TARGET=http://localhost:3001
```

To start a development server:

```bash
pnpm run dev
```

It starts the frontend (Vite, port 5173), the backend of `../server` (nodemon, port 3001) and its
embedder (`python embedder/server.py`) together. The backend needs its own `pnpm install` and its
`.env`, the embedder its Python packages (see `server/README.md`).
To start the frontend alone:

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

[//]: # (How to set up the database?)

[//]: # (How do you set the sensitive data?)

## Deployment

To run for production:

```bash
pnpm run build
```

`server/deploy/deploy.sh` copies the pages built in `dist/` to the server, where Caddy serves them
and sends `/api` on to the API (see `server/README.md`).

[//]: # ([### 1.3.1. On dev environment)

[//]: # ()
[//]: # (How to get dependencies and build?)

[//]: # (How to run the tests?)

[//]: # ()
[//]: # (### 1.3.2. On integration environment)

[//]: # ()
[//]: # (How to deploy the application outside the dev environment.])

## Directory structure


```shell
|-- docs
|   |-- UML                          # the use cases (use-case-diagram-sprint4.puml: as they stand now)
|   `-- design-mock                  # the mockups of the first sprints, before the editorial redesign
|-- src
|   |-- App.jsx                      # the routes of the pages
|   |-- components
|   |   |-- layout                   # the frame of a page: masthead, opening spread, colophon
|   |   |-- news                     # where to read a news, on the cards of the briefing and the search
|   |   `-- ui                       # buttons, fields, dialogs, the small "i", list filter, scroll area
|   |-- features
|   |   |-- auth                     # the signed in reader, asked to the server once, and the settings calls
|   |   |-- briefing
|   |   |   |-- api
|   |   |   `-- components           # the card of a story, the choice of the period, the sources
|   |   |-- custom-search
|   |   |   `-- api                  # the saved searches
|   |   |-- login
|   |   |   |-- api
|   |   |   `-- components
|   |   |-- navbar
|   |   |   `-- components           # the masthead of every page
|   |   `-- search
|   |       |-- api
|   |       |-- components
|   |       |   |-- article          # one news card, with how widely it is carried
|   |       |   |-- feed-list        # the results
|   |       |   |-- source-suggestions   # the media this search missed, and the ones to add
|   |       |   |-- summary-list     # the key passages of the news chosen
|   |       |   `-- thread-timeline  # the facts of one affair, in their order
|   |       |-- keptSearch.js        # the last search, kept a day in the browser
|   |       `-- translation.js       # the cards in another language translated when reached
|   |-- lib
|   |-- pages                        # Briefing, Search, Profile, Settings, Login, Signup
|   `-- styles
`-- tests
```

[//]: # (## 1.5. Collaborate)

[//]: # ()
[//]: # (* Take time to read some readme and find the way you would like to help other developers collaborate with you.)

[//]: # ()
[//]: # (* They need to know:)

[//]: # (    * How to propose a new feature &#40;issue, pull request&#41;)

[//]: # (    * [How to commit]&#40;https://www.conventionalcommits.org/en/v1.0.0/&#41;)

[//]: # (    * [How to use your workflow]&#40;https://nvie.com/posts/a-successful-git-branching-model/&#41;)

[//]: # ()
[//]: # (## 1.6. License)

[//]: # ()
[//]: # (* [Choose the license adapted to your project]&#40;https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository&#41;.)

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
