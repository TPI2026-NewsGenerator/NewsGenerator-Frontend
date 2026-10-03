# NewsGenerator-Frontend

## Description

It is a personalizable news generator. <br>
It must be able to read the news, understand it, and summarize the news it has read, taking into account
user parameters such as keywords, desired/undesired topics, language and timeframe of the search.

What the search page shows, beyond the news themselves:

- **how widely a news is carried** — how many media tell it, and how many of them wrote their own
  headline rather than republishing a wire. It says what was counted, never that the news is true.
  Above ten articles the card says `N media on this story` instead, as a safety net: a group that
  large is a running story followed from several angles, not one news confirmed that many times;
- **the words the article used to hedge** (`says "reportedly"`), when it has any;
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

The briefing page writes, on demand, up to ten stories of the last 24 hours, 2 days or 7 days closest to
the profile of the reader, each with its key passages as published, the media that told it, the
affair it belongs to and a thumb to vote; a small "i" explains each label of a card.

## Tech Stack

* [React.js](https://reactjs.org/) [v19.2.0] with framework [React Suite](https://rsuitejs.com/) [v6.1.2]

## Getting Started

### Prerequisites

List all dependencies and their version needed by the project as :

[//]: # (* DataBase Engine &#40;MySql, PostgreSQL, MSSQL,...&#41;)
* [Node.js](https://nodejs.org/) [v22.18.0]
* IDE used: [IntelliJ](https://www.jetbrains.com/idea/) [v2025.3.3]
* Package manager: [pnpm](https://pnpm.io/fr/) [v10.28.2]
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

It starts the frontend (Vite, port 5173) and the backend of `../server` (nodemon, port 3001) together.
The backend needs its own `pnpm install` and its `.env` (see `server/README.md`).
To start the frontend alone:

```bash
pnpm run dev:client
```

[//]: # (How to set up the database?)

[//]: # (How do you set the sensitive data?)

## Deployment

To run for production:

```bash
pnpm run build
```

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
|   |-- UML
|   `-- design-mock
|-- src
|   |-- assets
|   |-- features
|   |   |-- custom-search
|   |   |   `-- api
|   |   |-- login
|   |   |   `-- api
|   |   |-- navbar
|   |   |   `-- components
|   |   `-- search
|   |       |-- api
|   |       |   `-- searchApi.js
|   |       `-- components
|   |           |-- article              # one news card, with how widely it is carried
|   |           |-- feed-list            # the results
|   |           |-- source-suggestions   # the media this search missed, and the ones to add
|   |           |-- summary-list         # the AI resumes of the selected news
|   |           |-- text-gradient
|   |           |-- text-type
|   |           `-- user-feeds           # the sources this user added, private to them
|   |-- pages
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

This project is under [MIT License](https://en.wikipedia.org/wiki/MIT_License). See more under `LICENCE.md`

## Contact

Can contact me on discord: fab2y