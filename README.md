# NewsGenerator-Frontend

## Description

It is a personalizable news generator. <br>
It must be able to read the news, understand it, and summarize the news it has read, taking into account
user parameters such as keywords, desired/undesired topics, language and timeframe of the search.

## Tech Stack

* [React.js](https://reactjs.org/) with framework [React Suite](https://rsuitejs.com/)

## Getting Started

### Prerequisites

List all dependencies and their version needed by the project as :

[//]: # (* DataBase Engine &#40;MySql, PostgreSQL, MSSQL,...&#41;)
* IDE used: [IntelliJ](https://www.jetbrains.com/idea/)
* Package manager: [pnpm](https://pnpm.io/fr/)
* OS supported: All (web based)

[//]: # (* Virtualization &#40;Docker, .Net, .JDK, .JRE&#41;)

### Configuration
#### Environment
To install dependencies:

```bash
pnpm install
```

- Create an `.env` file such as the `.env.example` example file in `root` folder and insert API url:
```
VITE_API_URL=http://localhost:3001/api
```

To start a development server:

```bash
pnpm run dev
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
└───src
    ├───assets
    ├───components
    │   └───ui
    ├───styles
    └───views
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