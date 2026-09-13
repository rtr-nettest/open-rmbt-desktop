import { RMBTRustClient } from "./rmbt-rust-client.service"

/**
 * Native C measurement client.
 *
 * The C client speaks the identical JSON progress protocol as the Rust client,
 * so this reuses {@link RMBTRustClient} verbatim, only pointing it at the bundled
 * C binary in `dist/c_client`.
 *
 * Note: the C client has no Windows build (it uses POSIX socket APIs), so
 * {@link RMBTCClient.isAvailable} is false on Windows and the caller falls back
 * to the built-in JavaScript engine.
 */
export class RMBTCClient extends RMBTRustClient {
    constructor() {
        super("c_client", "C")
    }

    static isAvailable(): boolean {
        return RMBTRustClient.isAvailable("c_client")
    }
}
