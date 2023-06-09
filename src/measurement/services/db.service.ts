import { Store } from "./store.service"
import { Logger } from "./logger.service"
import {
    IMeasurementResult,
    MeasurementResultFields,
} from "../interfaces/measurement-result.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { SimpleHistoryResult } from "../dto/simple-history-result.dto"
import fs from "fs"
import initSqlJs, { Database } from "sql.js"

export class DBService {
    private static dbFilePath = Store.I.path.replace(
        "config.json",
        "ord-db.sqlite3"
    )
    private static instance = new DBService()

    static get I() {
        return this.instance
    }

    private db?: Database

    private constructor() {}

    async init() {
        try {
            if (!fs.existsSync(DBService.dbFilePath)) {
                fs.writeFileSync(DBService.dbFilePath, "")
            }
            const dbFile = fs.readFileSync(DBService.dbFilePath)
            const SQL = await initSqlJs()
            this.db = new SQL.Database(dbFile)
            this.createTable("measurement", MeasurementResultFields)
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async persist() {
        try {
            const data = this.db?.export()
            if (data) {
                fs.writeFileSync(DBService.dbFilePath, data)
            }
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async createTable(tableName: string, fields: string[] = []) {
        this.db?.run(
            `CREATE TABLE IF NOT EXISTS ${tableName} (${fields.join(",")})`
        )
        this.persist()
    }

    async saveMeasurement(result: IMeasurementResult) {
        try {
            // return await this.db.manager.save(Measurement.fromDto(result))
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async getMeasurementByUuid(
        testUuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        // try {
        //     const entry: Measurement = await this.db.manager.findOneByOrFail(
        //         Measurement,
        //         { test_uuid: testUuid }
        //     )
        //     return SimpleHistoryResult.fromLocalMeasurementResult(entry)
        // } catch (e) {
        // Logger.I.warn(e)
        return undefined
        // }
    }
}
