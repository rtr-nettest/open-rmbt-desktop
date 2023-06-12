import { Store } from "./store.service"
import { Logger } from "./logger.service"
import {
    IMeasurementResult,
    MEASUREMENT_TABLE,
} from "../interfaces/measurement-result.interface"
import { ISimpleHistoryResult } from "../interfaces/simple-history-result.interface"
import { SimpleHistoryResult } from "../dto/simple-history-result.dto"
import fs from "fs"
import fsp from "fs/promises"
import initSqlJs, { Database } from "sql.js"
import path from "path"

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
                await fsp.writeFile(DBService.dbFilePath, "")
            }
            const dbFile = await fsp.readFile(DBService.dbFilePath)
            const SQL = await initSqlJs()
            this.db = new SQL.Database(dbFile)
            await this.runMigrations()
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async persist() {
        try {
            const data = this.db?.export()
            if (data) {
                await fsp.writeFile(DBService.dbFilePath, data)
            }
        } catch (e) {
            Logger.I.warn(e)
        }
    }

    async runMigrations() {
        const migrationsFolder = path.resolve(__dirname, "migrations")
        const migrations = await fsp.readdir(migrationsFolder)
        for (const sqlFile of migrations) {
            try {
                const sql = (
                    await fsp.readFile(path.resolve(migrationsFolder, sqlFile))
                ).toString()
                this.db?.run(sql)
            } finally {
                continue
            }
        }
        await this.persist()
    }

    private formatValue(v: unknown) {
        return typeof v === "object"
            ? JSON.stringify(v)
            : v === undefined
            ? null
            : v
    }

    async saveMeasurement(result: IMeasurementResult) {
        try {
            const columns: string[] = Object.keys(result).map((c) => `:${c}`)
            const values: { [key: string]: any } = Object.entries(
                result
            ).reduce(
                (acc, [c, v]) => ({
                    ...acc,
                    [`:${c}`]: this.formatValue(v),
                }),
                {}
            )
            const entries: string[] = Object.keys(result).map(
                (c) => `${c}=:${c}`
            )
            const existingMeasurement = await this.getMeasurementByUuid(
                result.test_uuid
            )
            if (!existingMeasurement) {
                this.db?.exec(
                    `INSERT INTO ${MEASUREMENT_TABLE} VALUES (${columns.join(
                        ","
                    )})`,
                    values
                )
            } else {
                this.db?.exec(
                    `UPDATE ${MEASUREMENT_TABLE} SET ${entries.join(
                        ", "
                    )} WHERE test_uuid="${result.test_uuid}"`,
                    values
                )
            }
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
                return undefined
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
