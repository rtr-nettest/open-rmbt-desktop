import { existsSync } from "fs"
import { spawnSync } from "child_process"
import path from "path"
import { javaLauncherPath } from "../../measurement/services/java-client-path"

// Engine id → binary subdirectory (bundled next to dist/main.js by webpack).
const NATIVE_DIRS: Record<string, string> = {
    rust: "rust_client",
    c: "c_client",
}

// `--help` runs without network and exits 0 on a working binary/launcher, so
// this also rejects a build for the wrong architecture. `timeoutMs` is larger
// for Java, whose bundled JVM has a slower cold start than a native binary.
function runnable(bin: string, timeoutMs = 5000): boolean {
    try {
        if (!existsSync(bin)) return false
        const res = spawnSync(bin, ["--help"], { timeout: timeoutMs })
        return !res.error && res.status === 0
    } catch {
        return false
    }
}

function nativeRunnable(dir: string): boolean {
    const exe =
        process.platform === "win32" ? "rmbt-client.exe" : "rmbt-client"
    return runnable(path.join(__dirname, dir, exe))
}

// The Java engine is a jpackage app-image (bundled JRE) under dist/java_client.
function javaRunnable(): boolean {
    return runnable(javaLauncherPath(path.join(__dirname, "java_client")), 15000)
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
    const engines: string[] = []
    if (nativeRunnable(NATIVE_DIRS.rust)) engines.push("rust")
    if (nativeRunnable(NATIVE_DIRS.c)) engines.push("c")
    if (javaRunnable()) engines.push("java")
    engines.push("node")
    cache = engines
    return engines
}

/** Default engine for this platform: Rust if available, otherwise JavaScript. */
export function defaultEngine(): string {
    const engines = availableEngines()
    return engines.includes("rust") ? "rust" : engines[0]
}
