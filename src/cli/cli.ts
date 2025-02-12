import { MeasurementOptions } from "../measurement/interfaces/measurement-options.interface"
import { MeasurementRunner } from "../measurement"

async function main() {
    const options: MeasurementOptions = {
        platform: process.env.PLATFORM_CLI,
        termsAccepted: 6,
    }
    if (process.env.ENABLE_LOOP_MODE === "true") {
        while (true) {
            await MeasurementRunner.I.runMeasurement(options)
            await new Promise((res) => {
                setTimeout(() => res(void 0), 100)
            })
        }
    } else {
        await MeasurementRunner.I.runMeasurement(options)
        process.exit()
    }
}

main()
