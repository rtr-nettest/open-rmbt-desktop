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

```sh
$ npm run prepare:translations
```

To run a measurement from the command line use

```sh
$ npm run start:cli
```

To launch the app in the dev mode use

```sh
$ npm run start:all
```

To build the app in the prod mode without launching it use

```sh
$ npm run package
```

The app will be placed in the `out` folder at the root of the project.

## Distribution

### macOS

Requires macOS Ventura or later, XCode 12.2.0 or later.

1. Create and download Distribution, Mac Installer Distribution, and Developer ID certificates from https://developer.apple.com/account/resources/certificates/list (more info at https://developer.apple.com/help/account/create-certificates/create-developer-id-certificates/), then install them in your Mac's default keychain. You may have to restart the system to apply the changes.
2. Put the name of the installed certificates into the `.env` file as `APPLE_CODESIGN_IDENTITY` and `APPLE_INSTALLER_IDENTITY` respectively.
3. Create and donwload a distribution provisioning profile from https://developer.apple.com/account/resources/profiles/list and put it into the `src/assets/<FLAVOR>` folder as `RMBTDesktop_Distribution_Profile.provisionprofile`.
4. Set up the `.env` file with your `APPLE_ID`, `APPLE_PASSWORD`, and `APPLE_TEAM_ID`. See https://www.electronforge.io/guides/code-signing/code-signing-macos#option-1-using-an-app-specific-password for details.
5. Remove the `out` folder, if exists, then build the distributable with

```sh
$ npm run make:app-store
```

to get a `*.pkg` file for App Store, or with

```sh
$ npm run make:macos
```

to get a `*.dmg` file for standalone distribution (e.g. via GitHub Releases).

In both cases, a `*.pkg` and a `*.dmg` will be placed in the `out/make` folder at the root of the project.

5. To upload the `*.pkg` file to AppStore use Transporter: https://apps.apple.com/us/app/transporter/id1450874784.

_Note: by default macOS overwrites already installed packages, so, if you want to see the app in the menu and in the Applications folder on your dev machine, make sure to remove RMBTDesktop.app from anywhere else, including the `out` folder, before installing the `*.pkg`_

### Windows

Requires Windows 10 or later.

1. Configure, if needed, `@electron-forge/maker-squirrel` options of `src/assets/<FLAVOR>/forge.config.js`.
2. Build the distributable with

```sh
$ npm run make:windows
```

A setup `*.exe` will be placed in the `out/make` folder at the root of the project.

### Linux

To build a `*.deb` package, you will need a Linux or a macOS machine with `fakeroot` and `dpkg` installed. Run:

```sh
$ npm run make:deb
```

To buila a `*.rpm` package, you will need a Linux machine with `rpm` and `rpm-build` installed. Run:

```sh
$ npm run make:rpm
```

Both `deb` and `rpm` packages will be placed in the `out/make` folder at the root of the project. `RPM`s built on macOS are not valid and can be discarded.

## Updating

To enable auto-updates from Github releases, put the `GITHUB_API_URL` and `GITHUB_TOKEN` in the `.env` file.

## Configuration

The project contains a `.env.example` file. You can use it as an example to configure the variables needed to successfully run a measurement. The path to your custom `.env` file can be passed through an environment variable `RMBT_DESKTOP_DOTENV_CONFIG_PATH`. Otherwise the client will read the variables from a `.env` file in the root of the project, if such exists.

### Required variables

| Variable                       | Description                                                                                                                                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CONTROL_SERVER_URL`           | A complete URL of an RMBT-compatible control server, including protocol, host, and port if needed.                                                                                                     |
| `SETTINGS_PATH`                | A control server endpoint starting with ` /`, which is used to receive a measurement's settings including a unique id of the client.                                                                   |
| `MESUREMENT_REGISTRATION_PATH` | A control server endpoint starting with ` /`, which is used to register a measurement on the control server.                                                                                           |
| `RESULT_SUBMISSION_PATH`       | A control server endpoint starting with ` /`, which is used to submit results of a measurement to the control server.                                                                                  |
| `HISTORY_PATH`                 | A control server endpoint starting with `/`, from which we can receive a history of measurement results by the client's `uuid`.                                                                        |
| `HISTORY_RESULT_PATH`          | A control server endpoint starting with `/`, from which we can receive a saved measurement result by its ` test_uuid`.                                                                                 |
| `HISTORY_RESULT_PATH_METHOD`   | An HTTP method used to receive the result from the `HISTORY_RESULT_PATH` endpoint, either `GET` (when using the app with Specure servers) or ` POST` (when using the app with RTR servers).            |
| `HISTORY_RESULT_STATS_PATH`    | A control server endpoint starting with `/`, from which we can receive the measurement result speed charts by its ` open_test_uuid`. Required when using the app with RTR servers, otherwise optional. |
| `HISTORY_RESULT_DETAILS_PATH`  | A control server endpoint starting with `/`, from which we can receive the measurement result details by its ` open_test_uuid`. Required when using the app with RTR servers, otherwise optional.      |
| `HISTORY_EXPORT_URL`           | A URL used to export history as a PDF file. Once the file is downloaded, a dialog will be shown for the user to pick the folder where to save it.                                                      |
| `HISTORY_SEARCH_URL`           | A URL used to export history as a CSV or XSLX file. Once the file is downloaded, a dialog will be shown for the user to pick the folder where to save it.                                              |
| `FULL_HISTORY_RESULT_URL`      | A full URL, without ` test_uuid`, of a webpage, which contains a detailed measurement result.                                                                                                          |
| `OPEN_HISTORY_RESUlT_URL`      | A full URL, without ` open_test_uuid`, of a webpage, which contains an open measurement result for sharing.                                                                                            |
| `FLAVOR`                       | `rtr` or `ont`, determines the type of UI used for the Electron app. Defaults to ` rtr` if not set.                                                                                                    |
| `ASSETS_FOLDER`                | A path to a folder that contains flavor specific files, such as icons and styles.                                                                                                                      |

### Optional variables

| Variable                           | Description                                                                                                                                                                                                                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HISTORY_RESULTS_LIMIT`            | An amount of history entries to load at a time (i.e. page size). If omitted, all the available entries will be shown to the user at once.                                                                                                          |
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
| `APPLE_CODESIGN_IDENTITY`          | The name of the Distribution Certificate installed in your default Keychain.                                                                                                                                                                       |
| `APPLE_INSTALLER_IDENTITY`         | The name of the Mac Installer Distribution Certificate installed in your default Keychain.                                                                                                                                                         |
| `APPLE_ID`                         | Apple ID associated with your Apple Developer account.                                                                                                                                                                                             |
| `APPLE_PASSWORD`                   | App-specific password. See https://support.apple.com/en-us/HT204397 for details.                                                                                                                                                                   |
| `APPLE_TEAM_ID`                    | The Apple Team ID you want to notarize under. You can find Team IDs for team you belong to by going to https://developer.apple.com/account/#/membership.                                                                                           |
| `WINDOWS_CERT_PATH`                | Full path to your certificate.pfx                                                                                                                                                                                                                  |
| `GITHUB_API_URL`                   | https://api.github.com/repos/<account>/<repo>, is used to check for new releases.                                                                                                                                                                  |
| `GITHUB_TOKEN`                     | Github API token.                                                                                                                                                                                                                                  |
