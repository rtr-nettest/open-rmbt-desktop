import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
dayjs.extend(utc)
dayjs.extend(tz)
import { formatBytes, roundToSignificantDigits } from "../helpers/math"
import { Translation } from "@ngneat/transloco"
import { RESULT_DATE_FORMAT } from "./strings"

export const FORMATTED_FIELDS: Record<
    string,
    | null
    | ((testData: any, translations?: Translation, locale?: string) => string)
> = {
    test_duration: (testData: any) => `${testData.test_duration} s`,

    // Download
    bytes_download: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.bytes_download, t, locale!),
    test_if_bytes_download: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.test_if_bytes_download, t, locale!),
    testdl_if_bytes_download: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.testdl_if_bytes_download, t, locale!),
    testdl_if_bytes_upload: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.testdl_if_bytes_upload, t, locale!),
    ndt_download_kbit: (testData: any, t: any, locale?: string) =>
        `${roundToSignificantDigits(
            testData.ndt_download_kbit / 1e3,
        ).toLocaleString(locale!)} ${t["MB"] || "MB"}`,
    download_kbit: (testData: any, t: any, locale?: string) =>
        `${roundToSignificantDigits(
            testData.download_kbit / 1e3,
        ).toLocaleString(locale!)} ${t["Mbps"] || "Mbps"}`,

    // Upload
    bytes_upload: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.bytes_upload, t, locale!),
    test_if_bytes_upload: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.test_if_bytes_upload, t, locale!),
    testul_if_bytes_download: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.testul_if_bytes_download, t, locale!),
    testul_if_bytes_upload: (testData: any, t: any, locale?: string) =>
        formatBytes(testData.testul_if_bytes_upload, t, locale!),
    ndt_upload_kbit: (testData: any, t: any, locale?: string) =>
        `${roundToSignificantDigits(
            testData.ndt_upload_kbit / 1e3,
        ).toLocaleString(locale!)} ${t["MB"] || "MB"}`,
    upload_kbit: (testData: any, t: any, locale?: string) =>
        `${roundToSignificantDigits(testData.upload_kbit / 1e3).toLocaleString(
            locale!,
        )} ${t["Mbps"] || "Mbps"}`,

    wifi_link_speed: (testData: any, t: any) =>
        `${testData.wifi_link_speed} ${t["Mbps"] || "Mbps"}`,

    ping_ms: (testData: any, t: any, locale?: string) =>
        `${roundToSignificantDigits(testData.ping_ms).toLocaleString(locale!)} ${
            t["millis"] || "millis"
        }`,
    time_dl_ms: (testData: any, t: any, locale?: string) =>
        `${Math.round(testData.time_dl_ms).toLocaleString(locale!)} ${
            t["millis"] || "millis"
        }`,
    time_ul_ms: (testData: any, t: any, locale?: string) =>
        `${Math.round(testData.time_ul_ms).toLocaleString(locale!)} ${
            t["millis"] || "millis"
        }`,

    duration_download_ms: (testData: any, t: any, locale?: string) =>
        `${(
            Math.round(testData.duration_download_ms / 100) / 10
        ).toLocaleString(locale!)} s`,
    duration_upload_ms: (testData: any, t: any, locale?: string) =>
        `${(Math.round(testData.duration_upload_ms / 100) / 10).toLocaleString(
            locale!,
        )} s`,

    ip_anonym: (testData: any) => {
        var ip = testData?.ip_anonym ?? ""
        //add ".x" to IPv4 addresses
        if (ip.indexOf("x") === -1 && ip.indexOf(".") > 0) {
            ip += ".x"
        }
        return ip
    },
    network_country: (testData: any, t: any) =>
        t[testData.network_country?.toLowerCase()] || testData.network_country,
    sim_country: (testData: any, t: any) =>
        t[testData.sim_country?.toLowerCase()] || testData.sim_country,
    country_geoip: (testData: any, t: any) =>
        t[testData.country_geoip?.toLowerCase()] || testData.country_geoip,
    country_asn: (testData: any, t: any) =>
        t[testData.country_asn?.toLowerCase()] || testData.country_asn,
    country_location: (testData: any, t: any) =>
        t[testData.country_location?.toLowerCase()] ||
        testData.country_location,

    lte_rsrq: (testData: any, t: any) =>
        `${testData.lte_rsrq} ${t["dB"] || "dB"}`,

    roaming_type: (testData: any, t: any) => {
        let roaming_type = testData.roaming_type
        if (roaming_type === null) {
            return null
        }
        switch (roaming_type) {
            case 0:
                return t["roaming_none"]
            case 1:
                return t["roaming_national"]
            case 2:
                return t["roaming_international"]
        }
        return roaming_type
    },

    temperature: (testData: any) =>
        testData.temperature ? testData.temperature + " °C" : "",
    time: (testData: any) => {
        const d = dayjs(testData.time, RESULT_DATE_FORMAT).utc(true)
        return d.tz(dayjs.tz.guess()).format(RESULT_DATE_FORMAT)
    },

    // land_cover
    land_cover: (testData: any, t: any) =>
        `${testData.land_cover} - ${t[`corine_${testData.land_cover}`]}`,
    land_cover_cat1: (testData: any, t: any) =>
        `${Math.round(testData.land_cover / 100)} - ${
            t[`corine_${testData.land_cover - (testData.land_cover % 100)}`]
        }`,
    land_cover_cat2: (testData: any, t: any) =>
        `${Math.round(testData.land_cover / 10)} - ${
            t[`corine_${testData.land_cover - (testData.land_cover % 10)}`]
        }`,
    settlement_type: (testData: any, t: any) =>
        `${testData.settlement_type} - ${
            t[`settlement_type_${testData.settlement_type}`]
        }`,
    implausible: (_: any, t: any) => t["implausibleResult"],

    dtm_level: (testData: any, t: any) =>
        `${testData.dtm_level} ${t[`dtm_level_units`] || "m"}`,
}
