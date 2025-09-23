import { NUMBER_LOCALES } from "../constants/strings"

export function roundMs(value: number) {
  const resultNum = Math.round(value)
  let rounder = 1
  if (resultNum < 10) {
    rounder = 100
  } else if (resultNum < 100) {
    rounder = 10
  }
  return Math.round(value * rounder) / rounder
}

export function roundToSignificantDigits(number: number) {
  let rounder = 1
  if (number < 0.1) {
    rounder = 1000
  } else if (number < 1) {
    rounder = 100
  } else if (number < 10) {
    rounder = 10
  }
  return Math.round(number * rounder) / rounder
}

export function formatNumber(number: number, digits: number, locale: string) {
  const newDigit = new Intl.NumberFormat(NUMBER_LOCALES[locale], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(number)
  if (locale.includes("en")) {
    return newDigit.replace(/’/g, " ")
  }
  return newDigit
}

export function speedLog(speedMbps?: number) {
  if (speedMbps === undefined || speedMbps === null) {
    return -1
  }
  let yPercent = (1 + Math.log10(speedMbps)) / 5
  yPercent = Math.max(yPercent, 0)
  yPercent = Math.min(1, yPercent)
  return yPercent
}

export function formatBytes(bytes: any, t: any, locale: string) {
  if (bytes === null) return ""
  var unit = t["bytes"]
  if (bytes > 1000) {
    bytes = bytes / 1000
    unit = t["KB"]
  }
  if (bytes > 1000) {
    bytes = bytes / 1000
    unit = t["MB"]
  }
  return (
    roundToSignificantDigits(bytes).toLocaleString(locale) + "&nbsp;" + unit
  )
}

export function median(arr: number[]) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}
