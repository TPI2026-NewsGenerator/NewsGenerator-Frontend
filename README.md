# NewsGeneratorProject

## Description

It is a personalizable news generator. <br>
It must be able to read the news, understand it, and summarize the news it has read, taking into account
user parameters such as keywords, desired/undesired topics, language and timeframe of the search.

## Tech Stack

* **Frontend:** [React.js](https://reactjs.org/) with framework [React Suite](https://rsuitejs.com/)
* **Backend:** [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
* **AI Orchestration:** [Ollama](https://ollama.com/)

## Getting Started

### Prerequisites

List all dependencies and their version needed by the project as :

[//]: # (* DataBase Engine &#40;MySql, PostgreSQL, MSSQL,...&#41;)
* IDE used: IntelliJ
* Package manager: pnpm
* Application: Ollama (found here: https://ollama.com/download)
* OS supported: All (web based)

[//]: # (* Virtualization &#40;Docker, .Net, .JDK, .JRE&#41;)

### Configuration
#### Environment
To install dependencies:

```bash
pnpm install
```

To start a development server:

- `pnpm run dev`
- `pnpm run server`

#### Ollama

- Create an `.env` file in `server/services/` folder and insert you api key file:
```
OLLAMA_API_KEY=your_api_key
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
├───client
│   └───src
│       ├───assets
│       ├───components
│       │   └───ui
│       ├───styles
│       └───views
├───docs
└───server
    ├───api
    ├───db
    └───services
        └───storage
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

## Contact

Can contact me on discord: fab2y