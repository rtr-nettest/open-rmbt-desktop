# Open RMBT Desktop

## Simple setup

Install packages by running `npm i` or `yarn install` in the root folder and in the `src/ui` folder. Rename `example.env` file into `.env` (look into the [Configuration](#configuration) section of this document for details).
Language support can be updated at `src/assets/rtr/src/i18n.config.ts`.
In case of reinstalls, use `npm install --no-package-lock`.

### Measurement engine (native Rust client)

The native **Rust** measurement client (`src/measurement/rust_client/rmbt-client.exe` / `rmbt-client`) is **not** committed to this repo and is **not** built here. CI downloads it automatically (pinned by `MEASUREMENT_ENGINE_VERSION`), but for **local development you must fetch it once**:

```sh
$ npm run fetch:client
```

This downloads the Rust client for your platform from the [open-rmbt-client-cli](https://github.com/rtr-nettest/open-rmbt-client-cli/releases) releases and installs it into `src/measurement/rust_client/`. By default it uses the same version CI does — the default is set in `scripts/fetch-measurement-client.js` and should be kept in sync with `MEASUREMENT_ENGINE_VERSION` in the GitHub Actions workflow. Override it for a one-off fetch with:

```sh
$ MEASUREMENT_ENGINE_VERSION=<version> npm run fetch:client
```

> ⚠️ Without this (or with an outdated binary), measurements fall back to behavior the binary supports. An old/stub build that does not implement loop mode returns no loop UUID, which silently breaks loop-mode grouping and navigation — so make sure the local client is current.

## Compilation and running

To run a measurement from the command line use (for development purposes only)

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

1. Newly create and download Distribution, Mac Installer Distribution, and Developer ID certificates from https://developer.apple.com/account/resources/certificates/list (more info at https://developer.apple.com/help/account/create-certificates/create-developer-id-certificates/), then install them in your Mac's default keychain. You may have to restart the system to apply the changes.
2. Put the name of the installed certificates into the `.env` file as `APPLE_CODESIGN_IDENTITY` and `APPLE_INSTALLER_IDENTITY` respectively.
3. Create and donwload a distribution provisioning profile from https://developer.apple.com/account/resources/profiles/list and put it into the `src/assets/rtr` folder as `RMBTDesktop_Distribution_Profile.provisionprofile`.
4. Set up the `.env` file with your `APPLE_ID` and `APPLE_TEAM_ID`. Provide the Apple **app-specific password** through the shell environment (not the `.env`/`prod.env` file), only when building a signed macOS build:

    ```sh
    export APPLE_PASSWORD='xxxx-xxxx-xxxx-xxxx'
    npm run make:macos
    ```

    Generate the app-specific password at https://appleid.apple.com. In CI it would be provided as a GitHub Actions secret (`secrets.APPLE_PASSWORD`); note the CI workflow does not sign or notarize, so it never needs it. See https://www.electronforge.io/guides/code-signing/code-signing-macos#option-1-using-an-app-specific-password for details.
5. Make sure that all files have `644` or `744` permissions set.
6. Remove the `out` folder, if exists, then build the distributable with

```sh
$ npm run make:app-store
```

to get a `*.pkg` file for App Store, or with

```sh
$ npm run make:macos
```

to get a `*.dmg` file for standalone distribution (e.g. via GitHub Releases).

In both cases, a `*.pkg` and a `*.dmg` will be placed in the `out/make` folder at the root of the project.

Provide `--nosign` option to the commands above, if you don't want the builder to go through the signing procedure, like this:

```sh
$ npm run make:macos -- --nosign
```

7. To upload the `*.pkg` file to AppStore use Transporter: https://apps.apple.com/us/app/transporter/id1450874784.

_Note: by default macOS overwrites already installed packages, so, if you want to see the app in the menu and in the Applications folder on your dev machine, make sure to remove RMBTDesktop.app from anywhere else, including the `out` folder, before installing the `*.pkg`_

### Windows

Requires Windows 10 or later.

1. Configure, if needed, `@electron-forge/maker-squirrel` options of `src/assets/rtr/forge.config.js`.
2. Build the distributable with

```sh
$ npm run make:windows
```

A setup `*.exe` will be placed in the `out/make` folder at the root of the project.

For information on signing the standalone Windows `.exe` with a commercial (Certum) certificate see [Windows_code_signing.md](Windows_code_signing.md).

### Windows — Microsoft Store (MSIX)

The Microsoft Store does not distribute the Squirrel `.exe`; it distributes an **MSIX** package. The MSIX build is a separate, opt-in build (enabled by `WIN_STORE=true`) that does **not** touch the regular `make:windows` build, and it ships only the **Rust** measurement engine plus the built-in **JavaScript** fallback (no Java/C client).

Why MSIX for the Store:

- **No commercial code-signing certificate required.** The Store re-signs the package with a Microsoft-trusted certificate tied to your Partner Center publisher identity. A free self-signed certificate is enough to build/sign locally.
- **Automatic updates are handled by the Store** — so the MSIX build intentionally omits the Squirrel auto-updater.

#### Prerequisites

1. **Windows 10/11 SDK** (provides `makeappx.exe` and `signtool.exe`). Point `WINDOWS_KITS_PATH` at its `bin\<version>\x64` (or `arm64`) directory.
2. **Rust client** downloaded into `src/measurement/rust_client` (the CI job does this automatically; no Java is downloaded for the Store build).
3. **Partner Center identity** — reserve the app name in [Partner Center](https://partner.microsoft.com/dashboard) and copy the *Product identity* values into your `.env`:
    - `MSIX_PACKAGE_NAME` — the Identity **Name** (e.g. `RTRNetztest`).
    - `MSIX_PUBLISHER` — the Identity **Publisher** (e.g. `CN=<GUID>`).
4. A **signing certificate** whose subject matches `MSIX_PUBLISHER`. For local/dev builds, create a self-signed one:

    ```powershell
    $cert = New-SelfSignedCertificate -Type Custom -Subject "CN=<GUID>" `
      -KeyUsage DigitalSignature -CertStoreLocation "Cert:\CurrentUser\My" `
      -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3","2.5.29.19={text}")
    Export-PfxCertificate -Cert ("Cert:\CurrentUser\My\" + $cert.Thumbprint) `
      -FilePath .\msix-dev.pfx -Password (ConvertTo-SecureString "yourpass" -AsPlainText -Force)
    ```

    Then set `MSIX_CERT_PATH` to the `.pfx` path and `MSIX_CERT_PASS` to its password.

#### Build

```sh
$ npm run make:windows-store            # x64
$ npm run make:windows-store-arm64      # arm64
```

The signed package is written to `out/make/appx/<arch>/*.msix`.

#### Installing a test build locally (sideloading)

A locally built `.msix` is signed with the self-signed throwaway certificate, which Windows does not trust by default — so a direct install is rejected. For **test machines only**, trust the certificate first, then install. (This is never needed for Store installs: Microsoft re-signs the package, so end users just install it from the Store.)

The certificate lives in the private repo at `open-rmbt-desktop-private/MsStore/` (`msix-dev.pfx` = signing key, `msix-dev.cer` = public certificate to distribute for trust). It must be a certificate whose subject equals `MSIX_PUBLISHER`.

1. Copy the public cert `msix-dev.cer` and the `*.msix` to the test machine.
2. In an **elevated (Administrator) PowerShell**, trust the certificate (the `Trusted People` store under Local Machine is what Windows checks for sideloaded packages):

    ```powershell
    Import-Certificate -FilePath .\msix-dev.cer -CertStoreLocation Cert:\LocalMachine\TrustedPeople
    ```

    GUI alternative: double-click `msix-dev.cer` → **Install Certificate** → **Local Machine** → **Place all certificates in the following store** → **Trusted People**.

3. Install the package — double-click the `.msix` → **Install**, or:

    ```powershell
    Add-AppxPackage -Path .\RundfunkundTelekomRegulie.RTR-NetztestDesktop.msix
    ```

To uninstall and remove the trust afterwards:

```powershell
Get-AppxPackage *RTR-NetztestDesktop* | Remove-AppxPackage
# remove the trusted test cert (by its thumbprint, shown by Get-ChildItem Cert:\LocalMachine\TrustedPeople)
Remove-Item Cert:\LocalMachine\TrustedPeople\<thumbprint>
```

> ⚠️ Trusting a self-signed certificate lowers the machine's security — do it only on a disposable test machine and remove it when finished. Sideloading is enabled by default on Windows 10/11; Developer Mode is not required once the certificate is trusted.

#### Publish

Upload the `*.msix` to Partner Center (Product → Packages). The Store validates, re-signs, distributes, and keeps the app updated automatically. (The GitHub Actions workflow builds and signs the x64 and arm64 MSIX packages on every run using an ephemeral self-signed certificate; `MSIX_PACKAGE_NAME`/`MSIX_PUBLISHER` are read from `prod.env`.)

#### `runFullTrust` capability justification

The manifest declares the restricted capability `runFullTrust` (required for any Win32/Electron app packaged as MSIX). Partner Center asks for a justification during submission. Paste the following:

> **RTR-Netztest Desktop** is a classic Win32 desktop application (built with Electron) packaged as MSIX via the Desktop Bridge. Such packaged desktop apps run outside the AppContainer sandbox and therefore must declare `runFullTrust` together with `EntryPoint="Windows.FullTrustApplication"`; this is the standard, required declaration for any Electron/Win32 app distributed through the Store.
>
> The application genuinely requires full-trust execution to perform its core function — measuring internet connection quality:
>
> - It launches a bundled native measurement client (`rmbt-client.exe`) as a child process and communicates with it over stdio.
> - It opens direct TCP/TLS sockets to RMBT measurement servers to run download/upload/ping throughput tests.
> - It reads system CPU-load information during a measurement (to warn the user when results may be skewed) and persists a local measurement history in an on-disk SQLite database.
>
> These capabilities are not available to a sandboxed (AppContainer) app, so full-trust is necessary.

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

To build a `*.flatpak` bundle, you will need a Linux machine with `flatpak`, `flatpak-builder` and `elfutils` (for `eu-strip`) installed, plus the Freedesktop runtime/SDK and the Electron base app from Flathub:

```sh
$ flatpak remote-add --if-not-exists --user flathub https://flathub.org/repo/flathub.flatpakrepo
$ flatpak install --user -y flathub \
    org.freedesktop.Platform//26.08 \
    org.freedesktop.Sdk//26.08 \
    org.electronjs.Electron2.BaseApp//26.08
$ npm run make:flatpak
```

The `*.flatpak` is written to `out/make/flatpak/x86_64/`. Install it locally with `flatpak install --user ./RTR-Netztest-*.flatpak` (or `flatpak install --bundle ...`); the application id is derived from `APP_BUNDLE_ID` (the `.macos` suffix is stripped, e.g. `at.netztest.app`). Flatpak builds only on Linux — the deb/rpm/flatpak makers are each opt-in (`DEB`/`RPM`/`FLATPAK=true`) and are produced together by the Linux CI job.

## Configuration

The project contains an `example.env` file. You can use it as an example to configure the variables needed to successfully run a measurement. The path to your custom `.env` file can be passed through an environment variable `RMBT_DESKTOP_DOTENV_CONFIG_PATH`. Otherwise the client will read the variables from a `.env` file in the root of the project, if such exists.

### Required variables

| Variable                       | Description                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `CONTROL_SERVER_URL`           | A complete URL of an RMBT-compatible control server, including protocol, host, and port if needed.                                   |
| `SETTINGS_PATH`                | A control server endpoint starting with ` /`, which is used to receive a measurement's settings including a unique id of the client. |
| `MESUREMENT_REGISTRATION_PATH` | A control server endpoint starting with ` /`, which is used to register a measurement on the control server.                         |
| `RESULT_SUBMISSION_PATH`       | A control server endpoint starting with ` /`, which is used to submit results of a measurement to the control server.                |
| `HISTORY_PATH`                 | A control server endpoint starting with `/`, from which we can receive a history of measurement results by the client's `uuid`.      |
| `HISTORY_RESULT_PATH`          | A control server endpoint starting with `/`, from which we can receive a saved measurement result by its ` test_uuid`.               |
| `FULL_HISTORY_RESULT_URL`      | A full URL, without ` test_uuid`, of a webpage, which contains a detailed measurement result.                                        |
| `FULL_STATISTICS_URL`          | A full URL of a webpage to be shown in an iframe on the Statistics screen.                                                           |
| `FULL_MAP_URL`                 | A full URL of a webpage to be shown in an iframe on the Map screen.                                                                  |
| `OPEN_HISTORY_RESULT_URL`      | A full URL, without ` open_test_uuid`, of a webpage, which contains an open measurement result for sharing.                          |
| `ASSETS_FOLDER`                | A path to a folder that contains flavor specific files, such as icons and styles.                                                    |

### Optional variables

| Variable                             | Description                                                                                                                                                                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HISTORY_RESULTS_LIMIT`              | An amount of history entries to load at a time (i.e. page size). If omitted, all the available entries will be shown to the user at once.                                                                                                          |
| `MEASUREMENT_SERVERS_PATH`           | A control server endpoint starting with `/` which returns a list of measurement servers from which the client will try to pick one to run a measurement against.                                                                                   |
| `LOG_TO_CONSOLE`                     | If set to `true` will output the client's logs to the stdout and stderr.                                                                                                                                                                           |
| `LOG_TO_FILE`                        | If set to `true` will output the client's logs to a file in the `log` folder in the root of the project.                                                                                                                                           |
| `LOG_WORKERS`                        | If set to `true` will output the client's worker's logs to files in the `log` folder in the root of the project. If set to another value or ommitted, only the main thread's output will be logged.                                                |
| `LOG_CPU_USAGE`                      | If set to `true` will output the CPU usage in percent once a second during the measurement and submit it to the control server as well.                                                                                                            |
| `SSL_KEY_PATH` and `SSL_CERT_PATH`   | Paths to SSL key and certificate files, which should be used by the client to establish a secure connection to a measurement server.                                                                                                               |
| `PLATFORM_CLI`                       | A short string to differentiate the CLI client from the Electron app on the BE.                                                                                                                                                                    |
| `ALLOWED_INACTIVITY_MS`              | Configures a period of inactivity allowed, in milliseconds, before the measurement is terminated. Default is 10 seconds.                                                                                                                           |
| `ENABLE_LOOP_MODE`                   | If set to `true` will enable rudimentary loop mode (cururently supported only by the electron GUI).                                                                                                                                                |
| `NEWS_PATH`                          | A control server endpoint starting with `/` which returns a list of news available for the platform.                                                                                                                                               |
| `ENABLE_LANGUAGE_SWITCH`             | If set to true, will allow changing the app language from the settings.                                                                                                                                                                            |
| `APPLE_CODESIGN_IDENTITY`            | The name of the Distribution Certificate installed in your default Keychain.                                                                                                                                                                       |
| `APPLE_INSTALLER_IDENTITY`           | The name of the Mac Installer Distribution Certificate installed in your default Keychain.                                                                                                                                                         |
| `APPLE_ID`                           | Apple ID associated with your Apple Developer account.                                                                                                                                                                                             |
| `APPLE_PASSWORD`                     | App-specific password, used only for macOS notarization (`make:macos`). **Provide via the shell environment / CI secret, not the `.env`/`prod.env` file.** See https://support.apple.com/en-us/HT204397 for details.                                |
| `APPLE_TEAM_ID`                      | The Apple Team ID you want to notarize under. You can find Team IDs for team you belong to by going to https://developer.apple.com/account/#/membership.                                                                                           |
| `WINDOWS_CERT_PATH`                  | Full path to your certificate `.pfx`. Used by the Squirrel `.exe` maker (code-signing) and, for the Microsoft Store build, as the MSIX signing certificate.                                                                                          |
| `WINDOWS_CERT_PASS`                  | Password for the `.pfx` referenced by `WINDOWS_CERT_PATH` (MSIX signing). Keep it out of a public repo.                                                                                                                                             |
| `WINDOWS_KITS_PATH`                  | Path to the Windows SDK `bin` directory containing `makeappx.exe` / `signtool.exe`, e.g. `C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64`. Required for the MSIX build.                                                                  |
| `MSIX_PACKAGE_NAME`                  | MSIX Identity **Name** from Partner Center (Product identity), e.g. `RTRNetztest`. Public (embedded in the package); required for the Microsoft Store build.                                                                                         |
| `MSIX_PUBLISHER`                     | MSIX Identity **Publisher** from Partner Center, e.g. `CN=<GUID>`. Must match the signing certificate's subject. Public (embedded in the package); required for the Microsoft Store build.                                                           |
| `MSIX_PACKAGE_DISPLAY_NAME`          | Optional display name shown in the Store/Start menu. Defaults to `PACK_PRODUCT_NAME`.                                                                                                                                                               |
| `MSIX_PUBLISHER_DISPLAY_NAME`        | MSIX `PublisherDisplayName` — must match your Partner Center publisher display name exactly (e.g. `Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)`). Required for the Microsoft Store build.                                                       |
| `MSIX_MIN_OS_VERSION`                | Minimum Windows version for the MSIX (`TargetDeviceFamily MinVersion`). Must be `> 10.0.17134.0`; defaults to `10.0.17763.0`.                                                                                                                        |
| `MSIX_CERT_PATH`                     | Path to the MSIX signing `.pfx` (subject must equal `MSIX_PUBLISHER`). Falls back to `WINDOWS_CERT_PATH`. The Store re-signs, so a self-signed cert is fine. **Never commit the `.pfx`.**                                                              |
| `MSIX_CERT_PASS`                     | Password for `MSIX_CERT_PATH`. Falls back to `WINDOWS_CERT_PASS`. Keep it out of a public repo.                                                                                                                                                      |
| `LOOP_MODE_MIN_INTERVAL`             | Minimal allowed interval between tests in the loop mode, in minutes.                                                                                                                                                                               |
| `LOOP_MODE_MAX_INTERVAL`             | Maximal allowed interval between tests in the loop mode, in minutes.                                                                                                                                                                               |
| `LOOP_MODE_DEFAULT_INTERVAL`         | Interval between tests in the loop mode, in minutes, suggested by default.                                                                                                                                                                         |
| `LOOP_MODE_MAX_DURATION`             | Maximal allowed duration of the loop mode tests, in minutes.                                                                                                                                                                                       |
| `CPU_WARNING_PERCENT`                | Threshold of the CPU usage in percent, after which a warning is shown to the user during a test. Requires `LOG_CPU_USAGE` to be set to work.                                                                                                       |
| `ENABLE_HOME_SCREEN_JITTER_BOX`      | Enable the box on the home screen, that shows current ping, packet loss and jitter.                                                                                                                                                                |
| `PACK_NAME`                          | NPM name of the package.                                                                                                                                                                                                                           |
| `PACK_PRODUCT_NAME`                  | Human readable name of the package.                                                                                                                                                                                                                |
| `PACK_DESCRIPTION`                   | Description of the package.                                                                                                                                                                                                                        |
| `PACK_AUTHOR`                        | Author of the package.                                                                                                                                                                                                                             |
| `CHECK_IP_INTERVAL_MS`               | Interval for checking the IPv4/v6 addresses, in miliseconds (default: 10000, off: 0).                                                                                                                                                              |
| `EXCLUDE_MENU_ITEMS`                 | Names of the items to exclude from the side menu. See src/assets/rtr/src/app/constants/environment.ts for a list of available items.                                                                                                               |
