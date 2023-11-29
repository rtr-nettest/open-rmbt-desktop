export const TranslocoConfigExt: { [key: string]: any } = {
    availableLangs: ["en", "de", "es", "sl", "cs", "fr", "it", "no"],
    crowdinMappings: { //for some languages, crowdin will default to lang/country
        "es": "es-ES"
    },
    availableLocales: [
        // languages shown in the Settings
        { iso: "en", name: "English" },
        { iso: "de", name: "Deutsch" },
        { iso: "es", name: "Español" },
        { iso: "sl", name: "Slovenščina" },
        { iso: "cs", name: "Český" },
        { iso: "fr", name: "Français" },
        { iso: "it", name: "Italiano" },
        { iso: "no", name: "Norsk" },
    ],
    browserLangs: ["en", "de"], // languages supported by the web portal
    defaultLang: "en",
    defaultBrowserLang: "en",
}
