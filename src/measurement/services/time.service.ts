export class Time {
    private static instance = new Time()
    private mockedTime?: number

    private constructor() {}

    public static nowNs(): number {
        return this.instance.nowNs()
    }

    public static mockTime(mockedTime: number) {
        this.instance.mockedTime = mockedTime
    }

    public static mockRestore() {
        delete this.instance.mockedTime
    }

    private nowNs() {
        if (this.mockedTime) {
            return this.mockedTime
        }
        return Date.now() * 1e6
    }
}
