# Open RMBT Desktop

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

## Compilation and running

To run a measurement from the command line use

    npm run start:cli

To launch an Electron app in the dev mode use

    npm run start:all

To build the Electron app in the prod mode without launching it use

    npm run build:all
