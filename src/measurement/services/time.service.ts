export class Time {
    public static nowNs(): number {
        return Date.now() * 1e6
    }
}
