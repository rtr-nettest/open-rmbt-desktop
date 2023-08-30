import { CrowdinService } from "../src/measurement/services/crowdin.service"
import { TranslocoConfigExt } from "../src/ui/src/transloco.config"
import * as fsp from "fs/promises"
import * as path from "path"
import * as dotenv from "dotenv"

async function main() {
    const projectRoot = process.cwd()
    const dotenvConfig = path.join(projectRoot, ".env")
    console.log(`Loading .env file from ${dotenvConfig}`)
    dotenv.config({ path: dotenvConfig })
    const { availableLangs } = TranslocoConfigExt
    console.log(`Available languages`, availableLangs)
    for (const lang of availableLangs) {
        const translations = await CrowdinService.I.getTranslations(lang)
        if (!translations) {
            continue
        }
        await fsp.writeFile(
            path.join(
                projectRoot,
                "src",
                "ui",
                "src",
                "assets",
                "i18n",
                `${lang}.json`,
            ),
            JSON.stringify(translations, null, 2),
        )
    }
}

main()
