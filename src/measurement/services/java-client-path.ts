import path from "path"
import { existsSync } from "fs"

/**
 * Resolve the jpackage app-image launcher for the bundled Java measurement
 * client, given the base directory that holds the app-image (e.g.
 * `<dist>/java_client`).
 *
 * jpackage produces a different layout per OS:
 *   - macOS:   <base>/rmbt-client.app/Contents/MacOS/rmbt-client
 *   - Windows: <base>/rmbt-client.exe            (+ runtime/, app/)
 *   - Linux:   <base>/bin/rmbt-client            (+ lib/runtime, lib/app)
 *
 * Some release zips nest everything one extra level under `rmbt-client/`, so we
 * try a couple of candidates and return the first that exists (falling back to
 * the canonical path for sensible error messages when none is present).
 */
export function javaLauncherPath(baseDir: string): string {
    const candidates: string[] = []
    if (process.platform === "darwin") {
        candidates.push(
            path.join(baseDir, "rmbt-client.app", "Contents", "MacOS", "rmbt-client"),
            path.join(
                baseDir,
                "rmbt-client",
                "rmbt-client.app",
                "Contents",
                "MacOS",
                "rmbt-client",
            ),
        )
    } else if (process.platform === "win32") {
        candidates.push(
            path.join(baseDir, "rmbt-client.exe"),
            path.join(baseDir, "rmbt-client", "rmbt-client.exe"),
        )
    } else {
        candidates.push(
            path.join(baseDir, "bin", "rmbt-client"),
            path.join(baseDir, "rmbt-client", "bin", "rmbt-client"),
        )
    }
    return candidates.find((c) => existsSync(c)) ?? candidates[0]
}
