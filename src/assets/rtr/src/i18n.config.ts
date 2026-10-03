/**
 * Static localization config: the languages the UI ships with. Translations
 * themselves live in src/ui/src/assets/i18n/<lang>.json and are loaded at
 * runtime by I18nService. This file is copied into src/ui/src by copy-assets.
 */
export const I18N_CONFIG: { [key: string]: any } = {
    availableLangs: ["en", "de", "es", "sl", "cs", "fr", "it", "no"],
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
