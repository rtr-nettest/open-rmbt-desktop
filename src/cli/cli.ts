import { MeasurementRunner } from "../measurement"

async function main() {
    if (process.env.ENABLE_LOOP_MODE === "true") {
        while (true) {
            await MeasurementRunner.I.runMeasurement({
                platform: process.env.PLATFORM_CLI,
            })
            await new Promise((res) => {
                setTimeout(() => res(void 0), 100)
            })
        }
    } else {
        MeasurementRunner.I.runMeasurement({
            platform: process.env.PLATFORM_CLI,
        })
    }
}

main()
