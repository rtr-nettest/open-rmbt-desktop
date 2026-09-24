import { existsSync } from "fs"
import { spawnSync } from "child_process"
import path from "path"
import { javaLauncherPath } from "../../measurement/services/java-client-path"
import { Logger } from "../../measurement/services/logger.service"

// Engine id → binary subdirectory (bundled next to dist/main.js by webpack).
const NATIVE_DIRS: Record<string, string> = {
    rust: "rust_client",
    c: "c_client",
}

// `--help` runs without network and exits 0 on a working binary/launcher, so
// this also rejects a build for the wrong architecture. `timeoutMs` is larger
// for Java, whose bundled JVM has a slower cold start than a native binary.
//
// Every failure branch logs why (`label` names the engine): this probe decides
// whether an engine appears in the selector, and a silent false here was
// indistinguishable — on the affected machine — from "the option was never
// there". A missing binary, a wrong-arch/missing-DLL spawn error, a non-zero
// exit, or a timeout (`signal` = "SIGTERM", e.g. a slow cold start while AV
// scans a freshly-extracted exe) each now leaves a line in the log. Set
// LOG_TO_FILE=true to capture it under <userData>/log (LOG_TO_CONSOLE=true for
// stdout).
function runnable(bin: string, label: string, timeoutMs = 5000): boolean {
    try {
        if (!existsSync(bin)) {
            Logger.I.warn(
                `[engine-availability] ${label} unavailable: binary not found at ${bin}`,
            )
            return false
        }
        const res = spawnSync(bin, ["--help"], { timeout: timeoutMs })
        if (res.error || res.status !== 0) {
            Logger.I.warn(
                `[engine-availability] ${label} unavailable: probe of ${bin} failed ` +
                    `(error=${res.error?.message ?? "none"}, status=${res.status}, signal=${res.signal ?? "none"})`,
            )
            return false
        }
        Logger.I.info(`[engine-availability] ${label} available (${bin})`)
        return true
    } catch (e) {
        Logger.I.warn(
            `[engine-availability] ${label} unavailable: probe of ${bin} threw: ${e}`,
        )
        return false
    }
}

function nativeRunnable(label: string, dir: string): boolean {
    const exe =
        process.platform === "win32" ? "rmbt-client.exe" : "rmbt-client"
    return runnable(path.join(__dirname, dir, exe), label)
}

// The Java engine is a jpackage app-image (bundled JRE) under dist/java_client.
function javaRunnable(): boolean {
    return runnable(
        javaLauncherPath(path.join(__dirname, "java_client")),
        "Java",
        15000,
    )
}

let cache: string[] | undefined

/**
 * Engine ids selectable on this platform, in preference order. The JavaScript
 * ("node") engine is always available; native engines ("rust", "c") and the
 * bundled Java engine ("java") only when their binary/app-image is bundled and
 * runnable here (e.g. the C client has no Windows build; the Java app-image is
 * published only for macOS/arm64, Windows/x64 and Linux/x64). Memoized —
 * bundled binaries don't change at runtime.
 */
export function availableEngines(): string[] {
    if (cache) return cache
    // Idempotent (guarded by an internal flag): ensures the log file stream
    // exists before the probes run, regardless of whether MeasurementRunner
    // (which also calls this) has been constructed yet.
    Logger.init()
    const engines: string[] = []
    if (nativeRunnable("Rust", NATIVE_DIRS.rust)) engines.push("rust")
    if (nativeRunnable("C", NATIVE_DIRS.c)) engines.push("c")
    if (javaRunnable()) engines.push("java")
    engines.push("node")
    Logger.I.info(
        `[engine-availability] selectable engines: ${engines.join(", ")}`,
    )
    cache = engines
    return engines
}

/** Default engine for this platform: Rust if available, otherwise JavaScript. */
export function defaultEngine(): string {
    const engines = availableEngines()
    return engines.includes("rust") ? "rust" : engines[0]
}
