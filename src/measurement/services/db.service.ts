import path from "path"
import fs from "fs"
import { Store } from "./store.service"
import { Logger } from "./logger.service"
import { IMeasurementResult } from "../interfaces/measurement-result.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { SimpleHistoryResult } from "../dto/simple-history-result.dto"
import { Sequelize } from "sequelize"
import {
    Measurement,
    createMeasurementModel,
} from "../models/measurement.model"

export class DBService {
    private static dbFilePath = Store.I.path.replace(
        "config.json",
        "ord-db.sqlite3"
    )
    private static instance = new DBService()

    static get I() {
        return this.instance
    }

    private db = new Sequelize({
        dialect: "sqlite",
        storage: DBService.dbFilePath,
        logging: Logger.I.debug,
    })

    private constructor() {}

    async createMeasurementsTable() {
        try {
            createMeasurementModel(this.db)
            await Measurement.sync()
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async saveMeasurement(result: IMeasurementResult) {
        try {
            const entry = await Measurement.create(result as any)
            Logger.I.info("Saved to DB: %o", entry)
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async getMeasurementByUuid(
        testUuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        try {
            const entry: IMeasurementResult = (await Measurement.findOne({
                where: {
                    test_uuid: testUuid,
                },
            })) as unknown as IMeasurementResult
            Logger.I.info("Test UUID: %s. Entry %o", testUuid, entry)
            return SimpleHistoryResult.fromLocalMeasurementResult(entry)
        } catch (e) {
            Logger.I.warn(e)
            return undefined
        }
    }
}
