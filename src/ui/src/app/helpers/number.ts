import { NUMBER_LOCALES } from "../constants/strings"

export const patchToLocaleString = () => {
  const nativeToLocalString = Number.prototype.toLocaleString
  Number.prototype.toLocaleString = function (
    this: number,
    locales?: string | string[],
    options?: Intl.NumberFormatOptions
  ): string {
    if (locales === undefined) {
      return nativeToLocalString.call(this, locales, options)
    }
    const locale = Array.isArray(locales) ? locales[0] : locales
    const result = nativeToLocalString.call(
      this,
      NUMBER_LOCALES[locale],
      options
    )
    return locale.includes("en") ? result.replace(/’/g, " ") : result
  }
}
