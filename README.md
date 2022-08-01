# Open RMBT Desktop

## Status

This code is in early development and is not intended for production use.

## Requirements

The project requires Node.js v18 or later.

## Simple setup

Install packages by running `npm i`. Rename `.env.example` file into `.env`. Run `npm run start` to launch the measurement.

## Configuration

The project contains a `.env.example` file. You can use it as an example to configure some variables needed to successfully run a measurement. The path to your custom `.env` file can be passed through an environment variable `RMBT_DESKTOP_DOTENV_CONFIG_PATH`. Otherwise the client will try to read the variables from a `.env` file in the root of the project, if such exists.

The variables used are:

-   Required:
    -   `CONTROL_SERVER_URL` - a complete URL of an RMBT-compatible control server, including protocol, host, and port if needed.
    -   `SETTINGS_PATH` - a control server endpoint starting with `/` which is used to receive a measurement's settings including a unique id of the client.
    -   `MESUREMENT_REGISTRATION_PATH` - a control server endpoint starting with `/` which is used to register a measurement on the control server.
-   Optional:
    -   `X_NETTEST_CLIENT` - an identificator sent to the control server in an `X-Nettest-Client` HTTP header and used by some control server implementations to internally differentiate one client from another.
    -   `MEASUREMENT_SERVERS_PATH` - a control server endpoint starting with `/` which returns a list of measurement servers from which the client will try to pick one to run a measurement against.
    -   `LOG_TO_CONSOLE` - if set to `true` will output the client's logs to the stdout and stderr.
    -   `LOG_TO_FILE` - if set to `true` will output the client's logs to a file in the `log` folder in the root of the project.
    -   `LOG_WORKERS` - if set to `true` will output the client's worker's logs to files in the `log` folder in the root of the project. If set to another value or ommitted, only the main thread's output will be logged.
    -   `SSL_KEY_PATH` and `SSL_CERT_PATH` - paths to SSL key and certificate files which should be used by the client to establish a secure connection to a measurement server.

## Compilation

To compile the project into a single JS file ready for running launch `npm run build` form the terminal.

## Running

To compile and run the project launch `npm run start` from the terminal.

## Testing

To compile the project and run tests against it launch `npm run test` from the terminal.
