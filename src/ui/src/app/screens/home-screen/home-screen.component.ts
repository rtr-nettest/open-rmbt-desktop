import { Component, OnDestroy, OnInit } from "@angular/core"
import { Router } from "@angular/router"
import { TranslocoService } from "@ngneat/transloco"
import {
    BehaviorSubject,
    Subject,
    combineLatest,
    distinctUntilChanged,
    firstValueFrom,
    from,
    map,
    switchMap,
    takeUntil,
    tap,
} from "rxjs"
import { TERMS_AND_CONDITIONS, UNKNOWN } from "src/app/constants/strings"
import { ERoutes } from "src/app/enums/routes.enum"
import { CMSService } from "src/app/services/cms.service"
import { MessageService } from "src/app/services/message.service"
import { MainStore } from "src/app/store/main.store"
import { BaseScreen } from "../base-screen/base-screen.component"
import { HttpClient } from "@angular/common/http"

@Component({
    selector: "app-home-screen",
    templateUrl: "./home-screen.component.html",
    styleUrls: ["./home-screen.component.scss"],
})
export class HomeScreenComponent extends BaseScreen implements OnInit {
    env$ = this.mainStore.env$
    ipInfo$ = this.mainStore.settings$.pipe(
        map((settings) => {
            if (settings?.ipInfo) {
                const { publicV4, publicV6, privateV4, privateV6 } =
                    settings?.ipInfo
                return [
                    `${this.transloco.translate("IPv4")}:&nbsp;${this.getIPIcon(
                        publicV4,
                        privateV4
                    )}&nbsp;${publicV4}`,
                    `${this.transloco.translate("IPv6")}:&nbsp;${this.getIPIcon(
                        publicV6,
                        privateV6
                    )}&nbsp;${publicV6}`,
                ]
            }
            return [
                `${this.transloco.translate("IPv4")}:&nbsp;${this.getIPIcon(
                    UNKNOWN,
                    UNKNOWN
                )}`,
                `${this.transloco.translate("IPv6")}:&nbsp;${this.getIPIcon(
                    UNKNOWN,
                    UNKNOWN
                )}`,
            ]
        })
    )
    jitterInfo$ = this.mainStore.jitterInfo$.pipe(
        map((info) => {
            if (info) {
                const { jitter, packetLoss, ping } = info
                return [
                    `${this.transloco.translate(
                        "Ping"
                    )}:&nbsp;${ping} ${this.transloco.translate("ms")}`,
                    `${this.transloco.translate(
                        "Packet loss"
                    )}:&nbsp;${packetLoss}%`,
                    `${this.transloco.translate("Jitter")}:&nbsp;${jitter}`,
                ]
            } else {
                return [
                    `${this.transloco.translate("Ping")}:&nbsp;${UNKNOWN}`,
                    `${this.transloco.translate(
                        "Packet loss"
                    )}:&nbsp;${UNKNOWN}`,
                    `${this.transloco.translate("Jitter")}:&nbsp;${UNKNOWN}`,
                ]
            }
        })
    )
    testInviteImg$ = this.mainStore.env$.pipe(
        switchMap((env) =>
            this.cmsService.getAssetByName(
                `test-invite-img.${env?.X_NETTEST_CLIENT}.svg`
            )
        )
    )
    showProgress = true
    methodologyLink$ = this.cmsService.getProject().pipe(
        map(() => {
            const path = "methodology"
            let lang = this.transloco.getActiveLang()
            if (!["en", "de"].includes(lang)) {
                lang = "en"
            }
            return `${this.env$.value?.WEBSITE_HOST}/${lang}/${path}`
        })
    )
    location$ = new BehaviorSubject<any>(null)

    constructor(
        mainStore: MainStore,
        message: MessageService,
        private cmsService: CMSService,
        private router: Router,
        private transloco: TranslocoService,
        private http: HttpClient
    ) {
        super(mainStore, message)
    }

    ngOnInit(): void {
        this.mainStore.registerClient()
        this.mainStore
            .startLoggingJitter()
            .pipe(takeUntil(this.destroyed$))
            .subscribe()
        this.showProgress = false
    }

    getIPIcon(publicAddress: string, privateAddress: string) {
        if (publicAddress === UNKNOWN) {
            return '<i class="app-icon--class app-icon--class-gray"></i>'
        } else if (!publicAddress) {
            return '<i class="app-icon--class app-icon--class-red"></i>'
        } else if (publicAddress !== privateAddress) {
            return '<i class="app-icon--class app-icon--class-yellow"></i>'
        } else {
            return '<i class="app-icon--class app-icon--class-green"></i>'
        }
    }

    setGoogleLocation() {
        navigator.geolocation.getCurrentPosition(
            (p) => {
                console.log(p)
                this.location$.next(
                    `Lat: ${p.coords.latitude}, lon: ${p.coords.longitude}`
                )
            },
            (e) => console.error(e),
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    setMaxMindLocation() {
        firstValueFrom(
            this.http.get(
                `https://api-beta.nettest.org/maxmind-details?ip=${
                    this.mainStore.settings$.value?.ipInfo?.publicV6 ||
                    this.mainStore.settings$.value?.ipInfo?.publicV4
                }`
            )
        ).then((p: { [key: string]: any }) => {
            this.location$.next(
                `Lat: ${p["location"].latitude}, lon: ${p["location"].longitude}`
            )
        })
    }
}
