# Open RMBT Desktop

## Status

This code is in early development and is not intended for production use.

## Limitations

The client can produce incorrect results on connections faster than 10Gbps for download, 5Gbps for upload.

## Requirements

The project requires Node.js v18 or later.

## Simple setup

Install packages by running `npm i` or `yarn install` in the root folder and in the `src/react-ui` folder. Rename `.env.example` file into `.env` (look into the [Configuration](#configuration) section of this document for details).

## Compilation and running

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

## Configuration

The project contains a `.env.example` file. You can use it as an example to configure the variables needed to successfully run a measurement. The path to your custom `.env` file can be passed through an environment variable `RMBT_DESKTOP_DOTENV_CONFIG_PATH`. Otherwise the client will read the variables from a `.env` file in the root of the project, if such exists.

The variables used are:

-   Required:
    -   `CONTROL_SERVER_URL` - a complete URL of an RMBT-compatible control server, including protocol, host, and port if needed.
    -   `SETTINGS_PATH` - a control server endpoint starting with `/`, which is used to receive a measurement's settings including a unique id of the client.
    -   `MESUREMENT_REGISTRATION_PATH` - a control server endpoint starting with `/`, which is used to register a measurement on the control server.
    -   `RESULT_SUBMISSION_PATH` - a control server endpoint starting with `/`, which is used to submit results of a measurement to the control server.
    -   `HISTORY_RESULT_PATH` - a control server endpoint starting with `/`, from which we can receive a saved measurement result by its `test_uuid`.
    -   `HISTORY_RESULT_PATH_METHOD` - an HTTP method used to receive the result from the `HISTORY_RESULT_PATH` endpoint, either `GET` (when using the app with Specure servers) or `POST` (when using the app with RTR servers).
    -   `HISTORY_RESULT_STATS_PATH` - a control server endpoint starting with `/`, from which we can receive a measurement result by its `open_test_uuid`. Required when using the app with RTR servers, otherwise optional.
    -   `FULL_HISTORY_RESUlT_URL` - a full URL, without `test_uuid`, of a webpage, which contains a detailed measurement result.
    -   `FLAVOR` - `rtr` or `ont`, determines the type of UI used for the Electron app. Defaults to `rtr` if not set.
    -   `ASSETS_FOLDER` - a path to a folder that contains flavor specific files, such as icons and styles.
-   Optional:
    -   `X_NETTEST_CLIENT` - an identificator sent to the control server in an `X-Nettest-Client` HTTP header and used by Specure control servers to internally differentiate between the app's flavors.
    -   `MEASUREMENT_SERVERS_PATH` - a control server endpoint starting with `/` which returns a list of measurement servers from which the client will try to pick one to run a measurement against.
    -   `LOG_TO_CONSOLE` - if set to `true` will output the client's logs to the stdout and stderr.
    -   `LOG_TO_FILE` - if set to `true` will output the client's logs to a file in the `log` folder in the root of the project.
    -   `LOG_WORKERS` - if set to `true` will output the client's worker's logs to files in the `log` folder in the root of the project. If set to another value or ommitted, only the main thread's output will be logged.
    -   `LOG_CPU_USAGE` - if set to `true` will output the CPU usage in percent once a second during the measurement.
    -   `SSL_KEY_PATH` and `SSL_CERT_PATH` - paths to SSL key and certificate files which should be used by the client to establish a secure connection to a measurement server.
    -   `PLATFORM_CLI` - a short string to differentiate the CLI client from the Electron app on the BE.
    -   `CMS_URL` - a CMS instance to use for the `ont` flavor.
