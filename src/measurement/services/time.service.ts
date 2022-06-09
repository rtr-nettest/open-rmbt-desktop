export class Time {
    public static nowNs(): number {
        return new Date().getTime() * 1e6
    }
}
