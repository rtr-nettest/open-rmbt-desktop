import { Logger } from "./logger.service"
import { ICrowdinDownload, ICrowdinJson } from "../interfaces/crowdin.interface"

const axios = require("axios")
const xliff = require("xliff/cjs/xliff12ToJs")

export class CrowdinService {
    private static instance = new CrowdinService()

    static get I() {
        return this.instance
    }

    get options() {
        return {
            headers: {
                Authorization: `Bearer ${process.env.CROWDIN_API_TOKEN}`,
            },
        }
    }

    private constructor() {}

    async getTranslations(lang: string): Promise<ICrowdinJson | null> {
        try {
            const root = process.env.CROWDIN_PROJECT_URL
            if (!root) {
                return null
            }
            Logger.I.info("Exporting translations for language %s", lang)
            let download: ICrowdinDownload = (
                await axios.post(
                    `${root}/translations/exports`,
                    {
                        targetLanguageId: lang,
                        format: "xliff",
                    },
                    this.options
                )
            ).data
            Logger.I.info(
                "Translations file is avaialable at %s",
                download.data.url
            )
            const file = (
                await axios.get(download.data.url, {
                    responseType: "blob",
                })
            ).data
            Logger.I.info("Translations file is downloaded")
            const json = await xliff(file.toString())
            Logger.I.info("Translations file is converted to JSON")
            const translations = this.toTranslationFormat(json)
            Logger.I.info(
                "Translations file is converted to translations format"
            )
            return translations
        } catch (e) {
            Logger.I.error(e)
            return null
        }
    }

    toTranslationFormat(json: { [key: string]: any }) {
        const obj: { [key: string]: any } = json.resources["/en.json"]
        return Object.values(obj).reduce((acc, value) => {
            let key: string = value.additionalAttributes.resname.trim()
            if (key.indexOf('"') === 0) {
                key = key.slice(1)
            }
            if (key.indexOf('"') === key.length - 1) {
                key = key.slice(0, -1)
            }
            return {
                ...acc,
                [key]: value.target,
            }
        }, {})
    }
}
