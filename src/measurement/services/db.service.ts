import { Store } from "./store.service"
import { Logger } from "./logger.service"
import {
    IMeasurementResult,
    MEASUREMENT_TABLE,
    MeasurementResultFields,
} from "../interfaces/measurement-result.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { SimpleHistoryResult } from "../dto/simple-history-result.dto"
import fs from "fs"
import initSqlJs, { Database } from "sql.js"

export class DBService {
    private static dbFilePath = Store.I.path.replace(
        "config.json",
        "ord-db.sqlite"
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
            await this.createTable(MEASUREMENT_TABLE, MeasurementResultFields)
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
        await this.persist()
    }

    async saveMeasurement(result: IMeasurementResult) {
        try {
            const columns = Object.keys(result).map((c) => `:${c}`)
            const values = Object.entries(result).reduce(
                (acc, [c, v]) => ({
                    ...acc,
                    [`:${c}`]:
                        typeof v === "object"
                            ? JSON.stringify(v)
                            : v === undefined
                            ? null
                            : v,
                }),
                {}
            )
            this.db?.exec(
                `
                INSERT INTO ${MEASUREMENT_TABLE} VALUES (${columns.join(",")})
            `,
                values
            )
            await this.persist()
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async getMeasurementByUuid(
        testUuid: string
    ): Promise<ISimpleHistoryResult | undefined> {
        try {
            const resp = this.db?.exec(
                `SELECT * FROM ${MEASUREMENT_TABLE} WHERE test_uuid="${testUuid}"`
            )[0]
            if (!resp) {
                throw new Error("No response")
            }
            const entry = resp!.columns.reduce(
                (acc, col, index) => ({
                    ...acc,
                    [col]: resp!.values[0][index],
                }),
                {}
            ) as IMeasurementResult
            Logger.I.warn(entry)
            return SimpleHistoryResult.fromLocalMeasurementResult(entry)
        } catch (e) {
            Logger.I.warn(e)
            return undefined
        }
    }
}
