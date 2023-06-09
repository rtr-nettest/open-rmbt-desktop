import { Store } from "./store.service"
import { Logger } from "./logger.service"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { SimpleHistoryResult } from "../dto/simple-history-result.dto"
import { DataSource } from "typeorm"
import { Measurement } from "../models/measurement.model"

export class DBService {
    private static dbFilePath = Store.I.path.replace(
        "config.json",
        "ord-db.sqlite3"
    )
    private static instance = new DBService()

    static get I() {
        return this.instance
    }

    private db = new DataSource({
        type: "sqlite",
        database: DBService.dbFilePath,
        entities: [Measurement],
        logging: process.env.DEV === "true",
    })

    private constructor() {}

    async init() {
        try {
            await this.db.initialize()
            await this.db.synchronize()
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async saveMeasurement(result: IMeasurementResult) {
        try {
            return await this.db.manager.save(Measurement.fromDto(result))
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async getMeasurementByUuid(
        testUuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        try {
            const entry: Measurement = await this.db.manager.findOneByOrFail(
                Measurement,
                { test_uuid: testUuid }
            )
            return SimpleHistoryResult.fromLocalMeasurementResult(entry)
        } catch (e) {
            Logger.I.warn(e)
            return undefined
        }
    }
}
