# Open RMBT Desktop

## Status

This code is in early development and is not intended for production use.

## Limitations

The client can produce incorrect results on connections faster than 10Gbps for download, 5Gbps for upload.

## Requirements

The project requires Node.js v18 or later.

## Simple setup

Install packages by running `npm i` or `yarn install` in the root folder and in the `src/ui` folder. Rename `.env.example` file into `.env` (look into the [Configuration](#configuration) section of this document for details).

## Compilation and running

To download translations from the Crowdin API run

    npm run prepare:translations

or

    yarn prepare:translations

To run a measurement from the command line use

    npm run start:cli

or

    yarn start:cli

To launch an Electron app in the dev mode use

    npm run start:all

or

    yarn start:all

To build the Electron app in the prod mode without launching it use

    npm run package

or

    yarn package

The app will be placed in the `out` folder at the root of the project.

To build the installer of the Electron app in the prod mode use

    npm run make

The installer will be placed in the `out/make` folder at the root of the project.

## Configuration

The project contains a `.env.example` file. You can use it as an example to configure the variables needed to successfully run a measurement. The path to your custom `.env` file can be passed through an environment variable `RMBT_DESKTOP_DOTENV_CONFIG_PATH`. Otherwise the client will read the variables from a `.env` file in the root of the project, if such exists.

### Required variables

| Variable                       | Description                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CONTROL_SERVER_URL`           | A complete URL of an RMBT-compatible control server, including protocol, host, and port if needed.                                                                                          |
| `SETTINGS_PATH`                | A control server endpoint starting with ` /`, which is used to receive a measurement's settings including a unique id of the client.                                                        |
| `MESUREMENT_REGISTRATION_PATH` | A control server endpoint starting with ` /`, which is used to register a measurement on the control server.                                                                                |
| `RESULT_SUBMISSION_PATH`       | A control server endpoint starting with ` /`, which is used to submit results of a measurement to the control server.                                                                       |
| `HISTORY_RESULT_PATH`          | A control server endpoint starting with `/`, from which we can receive a saved measurement result by its ` test_uuid`.                                                                      |
| `HISTORY_RESULT_PATH_METHOD`   | An HTTP method used to receive the result from the `HISTORY_RESULT_PATH` endpoint, either `GET` (when using the app with Specure servers) or ` POST` (when using the app with RTR servers). |
| `HISTORY_RESULT_STATS_PATH`    | A control server endpoint starting with `/`, from which we can receive a measurement result by its ` open_test_uuid`. Required when using the app with RTR servers, otherwise optional.     |
| `FULL_HISTORY_RESUlT_URL`      | A full URL, without ` test_uuid`, of a webpage, which contains a detailed measurement result.                                                                                               |
| `FLAVOR`                       | `rtr` or `ont`, determines the type of UI used for the Electron app. Defaults to ` rtr` if not set.                                                                                         |
| `ASSETS_FOLDER`                | A path to a folder that contains flavor specific files, such as icons and styles.                                                                                                           |

### Optional variables

| Variable                           | Description                                                                                                                                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `X_NETTEST_CLIENT`                 | An identificator sent to the control server in an `X-Nettest-Client` HTTP header and used by Specure control servers to internally differentiate between the app's flavors.                                                                        |
| `MEASUREMENT_SERVERS_PATH`         | A control server endpoint starting with `/` which returns a list of measurement servers from which the client will try to pick one to run a measurement against.                                                                                   |
| `LOG_TO_CONSOLE`                   | If set to `true` will output the client's logs to the stdout and stderr.                                                                                                                                                                           |
| `LOG_TO_FILE`                      | If set to `true` will output the client's logs to a file in the `log` folder in the root of the project.                                                                                                                                           |
| `LOG_WORKERS`                      | If set to `true` will output the client's worker's logs to files in the `log` folder in the root of the project. If set to another value or ommitted, only the main thread's output will be logged.                                                |
| `LOG_CPU_USAGE`                    | If set to `true` will output the CPU usage in percent once a second during the measurement.                                                                                                                                                        |
| `SSL_KEY_PATH` and `SSL_CERT_PATH` | Paths to SSL key and certificate files, which should be used by the client to establish a secure connection to a measurement server.                                                                                                               |
| `PLATFORM_CLI`                     | A short string to differentiate the CLI client from the Electron app on the BE.                                                                                                                                                                    |
| `CMS_URL`                          | A CMS instance to use for the `ont` flavor.                                                                                                                                                                                                        |
| `ALLOWED_INACTIVITY_MS`            | Configures a period of inactivity allowed, in milliseconds, before the measurement is terminated. Default is 10 seconds.                                                                                                                           |
| `ENABLE_LOOP_MODE`                 | If set to `true` will enable rudimentary loop mode (cururently supported only by the electron GUI).                                                                                                                                                |
| `CROWDIN_PROJECT_URL`              | The translations' project in Crowdin. See `.env.example` on how to use. The avaialable languages can be configured in `src/assets/<FLAVOR>/src/transloco.config.ts`. The matching translation files should be present in `src/ui/src/assets/i18n`. |
| `CROWDIN_API_TOKEN`                | More information at https://crowdin.com/project/open-rmbt-desktop/tools/api.                                                                                                                                                                       |
| `CROWDIN_UPDATE_AT_RUNTIME`        | If set to true, will try to download translations via the Crowdin API when user launches the app.                                                                                                                                                  |
| `NEWS_PATH`                        | A control server endpoint starting with `/` which returns a list of news available for the platform.                                                                                                                                               |
| `ENABLE_LANGUAGE_SWITCH`           | If set to true, will allow changing the app language from the settings.                                                                                                                                                                            |
