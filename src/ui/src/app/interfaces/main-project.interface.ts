import { ITranslatable } from "./translatable.interface"

export interface IMainProject extends ITranslatable {
    app_store_link?: string
    contact_details?: string
    copyright?: string
    data_export_start_date?: string
    footer_logo_link?: string
    google_analytics_id?: string
    google_play_link?: string
    google_tag_manager_code?: string
    app_store_beta_link?: string
    google_play_beta_link?: string
    id: string
    information?: string
    name: string
    slug: string
    visible_name?: string
    version?: string
    mapbox_actual_date?: string
    can_choose_server?: boolean
    enable_cookie_widget: boolean
    enable_stats_mno_isp_switch?: boolean
    regulator_link?: string
    require_location?: boolean
    location?: { longitude: number; latitude: number }
}
