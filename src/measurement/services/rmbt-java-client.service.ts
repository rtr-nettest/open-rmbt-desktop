import { spawnSync } from "child_process"
import path from "path"
import { existsSync } from "fs"
import { Logger } from "./logger.service"
import { RMBTRustClient } from "./rmbt-rust-client.service"
import { javaLauncherPath } from "./java-client-path"

/**
 * Bundled Java measurement client (jpackage app-image with its own JRE — no
 * system Java required).
 *
 * The Java client speaks the identical CLI + JSON progress protocol as the Rust
 * client, so this reuses {@link RMBTRustClient} verbatim and only points it at
 * the jpackage launcher inside `dist/java_client` (see {@link javaLauncherPath}
 * for the per-OS layout). Because it extends RMBTRustClient it is treated as an
 * "external" engine that submits its own results (see finalizeMeasurement).
 *
 * Availability depends on the app-image being bundled for this platform; the
 * jpackage app-image is published for macOS/arm64, Windows/x64 and Linux/x64.
 * When absent or not runnable, the caller falls back to the JavaScript engine.
 */
export class RMBTJavaClient extends RMBTRustClient {
    /** Base directory (next to dist/main.js) holding the jpackage app-image. */
    static baseDir(): string {
        return path.join(__dirname, "java_client")
    }

    static launcherPath(): string {
        return javaLauncherPath(RMBTJavaClient.baseDir())
    }

    constructor() {
        super("java_client", "Java")
    }

    protected override getBinaryPath(): string {
        return RMBTJavaClient.launcherPath()
    }

    static isAvailable(): boolean {
        try {
            const bin = RMBTJavaClient.launcherPath()
            if (!existsSync(bin)) {
                Logger.I.warn(`Java client launcher not bundled at ${bin}`)
                return false
            }
            // Probe: `--help` starts the bundled JVM and exits 0 on a working
            // image. A cold JVM is slower than a native binary, so allow more
            // time than the Rust/C probe.
            const res = spawnSync(bin, ["--help"], { timeout: 15000 })
            if (res.error || res.status !== 0) {
                Logger.I.warn(
                    `Java client probe failed (${res.error?.message ?? "exit " + res.status})`,
                )
                return false
            }
            return true
        } catch (e) {
            Logger.I.warn("Java client availability check threw: " + e)
            return false
        }
    }
}
