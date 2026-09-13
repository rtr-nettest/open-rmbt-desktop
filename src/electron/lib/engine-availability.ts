import { existsSync } from "fs"
import { spawnSync } from "child_process"
import path from "path"

// Engine id → binary subdirectory (bundled next to dist/main.js by webpack).
const NATIVE_DIRS: Record<string, string> = {
    rust: "rust_client",
    c: "c_client",
}

function nativeRunnable(dir: string): boolean {
    try {
        const exe =
            process.platform === "win32" ? "rmbt-client.exe" : "rmbt-client"
        const bin = path.join(__dirname, dir, exe)
        if (!existsSync(bin)) return false
        // `--help` runs without network and exits 0 on a working binary, so this
        // also rejects a binary built for the wrong architecture.
        const res = spawnSync(bin, ["--help"], { timeout: 5000 })
        return !res.error && res.status === 0
    } catch {
        return false
    }
}

let cache: string[] | undefined

/**
 * Engine ids selectable on this platform, in preference order. The JavaScript
 * ("node") engine is always available; native engines ("rust", "c") only when
 * their binary is bundled and runnable here (e.g. the C client has no Windows
 * build). Memoized — bundled binaries don't change at runtime.
 */
export function availableEngines(): string[] {
    if (cache) return cache
    const engines: string[] = []
    if (nativeRunnable(NATIVE_DIRS.rust)) engines.push("rust")
    if (nativeRunnable(NATIVE_DIRS.c)) engines.push("c")
    engines.push("node")
    cache = engines
    return engines
}

/** Default engine for this platform: Rust if available, otherwise JavaScript. */
export function defaultEngine(): string {
    const engines = availableEngines()
    return engines.includes("rust") ? "rust" : engines[0]
}
