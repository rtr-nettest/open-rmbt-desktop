# Mac App Store submission

How the RTR-Netztest desktop app is packaged and signed for the **Mac App
Store**. The build is **arm64-only** and ships the **Rust** measurement engine
(the Java engine is deliberately excluded from this target).

The deliverable is a signed installer **`.pkg`** containing a sandboxed
`.app`. A `.pkg` is the format App Store Connect / Transporter ingests for Mac
App Store apps.

---

## Certificates: what you need, and what you don't

The Mac App Store **cannot** accept a self-signed or local-only certificate,
and Apple does **not** re-sign your upload. A submission must be signed with
**Apple-issued distribution certificates** tied to a paid **Apple Developer
Program** membership.

Those Apple certificates are **not** commercial third-party CA certificates
(DigiCert / Sectigo / Certum, etc.). They are free with the membership and
issued by Apple's own CA, so this target needs **no commercial code-signing
certificate** — only an Apple Developer account.

Two certificates (both created from the Apple Developer portal or Xcode):

| Purpose | Certificate | Used to sign |
| --- | --- | --- |
| App code signing | **Apple Distribution** | the `.app` and every nested binary |
| Installer signing | **Mac Installer Distribution** (shown in the keychain as *3rd Party Mac Developer Installer*) | the `.pkg` |

Plus, in App Store Connect / the Developer portal:

- An **App ID** matching the bundle id `at.netztest.app.macos`, with the **App
  Groups** capability enabled.
- A **Mac App Store provisioning profile** for that App ID, downloaded as
  `src/assets/rtr/RMBTDesktop_Distribution_Profile.provisionprofile`.

Current identity values live in `.env`:

```
APP_BUNDLE_ID="at.netztest.app.macos"
APPLE_ID="developer@netztest.at"
APPLE_TEAM_ID="T7Y947AEPK"
APPLE_CODESIGN_IDENTITY="Apple Distribution: RTR-GmbH (T7Y947AEPK)"
APPLE_INSTALLER_IDENTITY="3rd Party Mac Developer Installer: RTR-GmbH (T7Y947AEPK)"
```

---

## What the build contains

- **Engine:** Rust only. The Java client is dropped from the App Store build
  (`forge.config.js` adds `java_client` to the packager `ignore` list when
  `APP_STORE=true`). Fetch the engine with `npm run fetch:client` (Rust); you do
  **not** need `npm run fetch:engines` for this target.
- **Sandbox:** the App Store sandbox is mandatory. Entitlements are in
  `src/assets/rtr/entitlements.plist` (app-sandbox, network client/server,
  user-selected files, print, USB). `scripts/codesign-app.js` additionally
  injects `com.apple.application-identifier` and
  `com.apple.security.application-groups` as `<TEAM_ID>.<bundle id>`.
- **Architecture:** arm64. Minimum macOS reported by the package is 13.0.

---

## Local dry-run (no Apple account)

Produces the exact **arm64 `mas` `.app` + `.pkg`** so the packaging pipeline can
be validated locally. The result is **unsigned and NOT uploadable** — it is a
build/format check only. Because the App Store sandbox rejects a non-Apple
signature, there is no local-cert shortcut to a submittable artifact.

> `@electron-forge/maker-pkg` always requires a signing identity, so for the
> unsigned dry-run we package the app and wrap it with `productbuild` directly
> instead of going through the maker.

```bash
# 1. Rust engine + web UI + webpack bundle
npm run fetch:client
npm run build:all

# 2. Package the sandboxed arm64 .app WITHOUT signing
#    (NOSIGN=true works for both `package` and `make`; the --nosign flag only
#     works for `make`.)
APP_STORE=true NOSIGN=true npx electron-forge package --platform=mas --arch=arm64

# 3. Wrap it into an unsigned installer .pkg
productbuild \
  --component "out/RTR-Netztest-mas-arm64/RTR-Netztest.app" \
  /Applications \
  out/RTR-Netztest-unsigned.pkg
```

Verify:

```bash
pkgutil --check-signature out/RTR-Netztest-unsigned.pkg   # -> Status: no signature
pkgutil --payload-files   out/RTR-Netztest-unsigned.pkg | grep rmbt-client
```

---

## Signed build for submission

On a machine (or CI runner) where both Apple certificates are installed in the
keychain and the provisioning profile is present, a single command produces the
**signed** `.pkg`:

```bash
npm run make:app-store
```

This runs `build:all`, then
`APP_STORE=true electron-forge make --platform=mas --arch=arm64`, which:

1. Packages the sandboxed arm64 `.app`.
2. In the `postPackage` hook, `scripts/codesign-app.js`:
   - sets `ElectronTeamID` and `ITSAppUsesNonExemptEncryption=false` in
     `Info.plist`;
   - embeds the provisioning profile as `embedded.provisionprofile`;
   - deep-signs every nested bundle **and** the bare Rust `rmbt-client` binary
     with inherited (child) entitlements, then the top-level `.app` with the
     full entitlements, using `APPLE_CODESIGN_IDENTITY`.
3. `@electron-forge/maker-pkg` signs the installer `.pkg` with
   `APPLE_INSTALLER_IDENTITY`.

The signed `.pkg` is written to
`out/make/pkg/arm64/RTR-Netztest-<version>-arm64.pkg`.

`codesign-app.js` strips extended attributes (`xattr -cr`) from the app before
signing, so the *"resource fork / Finder information … not allowed"* failure
does not occur.

Verify before uploading:

```bash
APP=out/RTR-Netztest-mas-arm64/RTR-Netztest.app
codesign --verify --deep --strict "$APP"          # -> valid on disk
codesign -dv --verbose=4 "$APP" 2>&1 | grep Authority   # Apple Distribution: RTR-GmbH
pkgutil --check-signature out/make/pkg/arm64/*.pkg      # 3rd Party Mac Developer Installer
```

### Upload to App Store Connect

**Prerequisite:** an **app record** must exist in App Store Connect for the
macOS bundle id `at.netztest.app.macos` (My Apps ▸ **+** ▸ New App ▸ platform
**macOS**). The iOS app (`at.netztest.app.ios`) is a separate record.

**Easiest — Transporter.app** (free, Mac App Store): open it, drag in the
signed `.pkg`, **Deliver**. It validates the signature chain, entitlements,
sandbox, and bundle id, and reports errors inline.

**CLI** — note `altool` ships with full Xcode, not the Command Line Tools, so
select Xcode first:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcrun altool --upload-app -t macos \
  -f out/make/pkg/arm64/RTR-Netztest-<version>-arm64.pkg \
  --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID"
```

### Test via TestFlight before submitting for review

A Mac-App-Store-signed build (distribution profile, no devices) will **not**
launch from the local `out/` folder. To actually exercise the sandbox — in
particular the two risks below — upload the build, then install it through
**TestFlight** and confirm a measurement runs end to end.

---

## GitHub Actions (CI): release on a git tag

Workflow: `.github/workflows/release-app-store.yml`. It runs on `macos-latest`
(arm64) when a **`v*` tag** is pushed, and it signs + uploads automatically.

**No Apple secret is stored in this (public) repo.** The only GitHub secret is
the existing **`REPO_TOKEN`** (read access to the private repo). Everything else
lives in the private repo **`rtr-nettest/open-rmbt-desktop-private`**, which the
workflow checks out with that token:

```
prod.env                                          # APPLE_* identities, ASSETS_FOLDER, APP_BUNDLE_ID, …
apple/dist.p12                                    # "Apple Distribution: RTR-GmbH" identity (cert + private key)
apple/installer.p12                               # "3rd Party Mac Developer Installer: RTR-GmbH" identity
apple/RMBTDesktop_Distribution_Profile.provisionprofile
apple/AuthKey_<ASC_KEY_ID>.p8                     # App Store Connect API key
apple/apple.env                                   # APPLE_CERT_PASSWORD, KEYCHAIN_PASSWORD, ASC_KEY_ID, ASC_ISSUER_ID
```

The job: checks out this repo + the private repo → loads `prod.env` as `.env`
and masks the values from `apple.env` → imports both `.p12` into a throwaway
keychain → drops the profile into `$ASSETS_FOLDER` and the `.p8` into
`~/.appstoreconnect/private_keys/` → `npm run make:app-store` → `altool
--validate-app` then `--upload-app`.

Release flow: bump `version` in `package.json`, commit, then
`git tag -a v2.5.4 -m v2.5.4 && git push --tags`.

---

## Open items / risks to validate (via TestFlight)

1. **Sandbox + spawning the Rust engine.** The app shells out to the bundled
   `rmbt-client`. Under the App Store sandbox an app may execute only code it
   bundles and signs with the same team id — the signing step covers the binary
   (it is signed with inherited entitlements), but confirm the sandbox actually
   permits spawning it at runtime.
2. **Raw sockets.** Ping / traceroute may need privileges the App Store sandbox
   does not grant. Verify these measurements work inside the sandbox, or gate
   them off for the App Store build.

Both are best validated on a TestFlight install (see above), since the signed
build does not run from `out/`.

_Resolved while setting this up: extended attributes are stripped automatically
before signing; no app group is used (single app, no extensions)._
