import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import tz from "dayjs/plugin/timezone"
import { RESULT_DATE_FORMAT } from "./strings"
dayjs.extend(utc)
dayjs.extend(tz)

export const SEARCHABLE_FIELDS: {
    [key: string]: null | ((testData: any) => string | string[])
} = {
    cat_technology: null,
    land_cover: (testData: any) => testData["land_cover"],
    radio_band: null,
    network_name: null,
    provider_name: null,
    network_country: null,
    country_sim: (testData: any) => testData["sim_country"],
    country_geoip: (testData: any) => testData.country_geoip?.toLowerCase(),
    public_ip_as_name: null,
    country_asn: (testData: any) => testData.country_asn?.toLowerCase(),
    platform: null,
    model: null,
    client_version: null,
    open_uuid: null,
    time: (testData: any) => {
        const d = dayjs(testData.time, RESULT_DATE_FORMAT)
        return [
            `>${d.startOf("day").utc().format(RESULT_DATE_FORMAT)}`,
            `<${d.endOf("day").utc().format(RESULT_DATE_FORMAT)}`,
        ]
    },
}
