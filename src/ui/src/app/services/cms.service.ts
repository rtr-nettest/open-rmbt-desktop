import { HttpClient, HttpParams } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { Observable, of } from "rxjs"
import {
    catchError,
    distinct,
    first,
    map,
    switchMap,
    tap,
    withLatestFrom,
} from "rxjs/operators"
import { IMainAsset } from "../interfaces/main-asset.interface"
import { IMainProject } from "../interfaces/main-project.interface"
import { MainStore } from "../store/main.store"
import { IMainMenuItem } from "../interfaces/main-menu-item.interface"
import { environment } from "../constants/environment"
import { CLIENTS } from "../constants/clients"
import { IMainPage } from "../interfaces/main-page.interface"

@Injectable({
    providedIn: "root",
})
export class CMSService {
    get headers() {
        return {
            "Content-Type": "application/json",
            "X-Nettest-Client": this.projectSlug,
        }
    }

    get apiUrl(): string {
        return this.mainStore.env$.value?.CMS_URL ?? ""
    }

    get projectSlug(): string {
        return this.mainStore.env$.value?.X_NETTEST_CLIENT ?? ""
    }

    constructor(private http: HttpClient, private mainStore: MainStore) {}

    getMenu(): Observable<IMainMenuItem[]> {
        return of(environment.menu)
    }

    getProjects(): Observable<IMainProject[]> {
        return this.http
            .get<IMainProject[]>(`${this.apiUrl}/projects`, {
                headers: this.headers,
            })
            .pipe(
                map((projects) => {
                    const projectMap: { [key: string]: IMainProject } =
                        projects.reduce(
                            (acc, c) => ({ ...acc, [c.slug]: c }),
                            {}
                        )
                    const filteredProjectMap: { [key: string]: IMainProject } =
                        CLIENTS.reduce(
                            (acc, c) => ({ ...acc, [c]: projectMap[c] }),
                            {}
                        )
                    return Object.values(filteredProjectMap)
                })
            )
    }

    getProject(options?: {
        dropCache: boolean
    }): Observable<IMainProject | null> {
        return this.mainStore.project$.pipe(
            withLatestFrom(this.mainStore.env$),
            switchMap(([project, env]) => {
                if (env?.FLAVOR !== "ont") {
                    return of(null)
                }
                if (!project || options?.dropCache) {
                    return this.http
                        .get<IMainProject[]>(`${this.apiUrl}/projects`, {
                            params: new HttpParams({
                                fromObject: {
                                    slug: this.projectSlug,
                                    _limit: "1",
                                },
                            }),
                            headers: this.headers,
                        })
                        .pipe(map((projects) => projects?.[0]))
                }
                return of(project)
            }),
            catchError(() => of(null)),
            distinct((project) => project?.slug)
        )
    }

    getAssetByName(name: string): Observable<IMainAsset | null> {
        return this.mainStore.assets$.pipe(
            first(),
            switchMap((s) =>
                s[name]
                    ? of(s[name])
                    : this.http
                          .get<IMainAsset[]>(`${this.apiUrl}/upload/files`, {
                              params: { name },
                          })
                          .pipe(
                              map((assets) =>
                                  assets.length
                                      ? ({
                                            ...assets[0],
                                            url: `${this.apiUrl}${assets[0].url}`,
                                        } as IMainAsset)
                                      : null
                              ),
                              catchError(() => of(null)),
                              tap((asset) => {
                                  if (asset?.name) {
                                      const newAssets = {
                                          ...this.mainStore.assets$.value,
                                          [asset.name]: asset,
                                      }
                                      this.mainStore.assets$.next(newAssets)
                                  }
                              })
                          )
            )
        )
    }

    getPage(route: string): Observable<IMainPage> {
        return this.http.get<IMainPage>(`${this.apiUrl}/pages`, {
            params: new HttpParams({
                fromObject: {
                    "menu_item.route": route,
                    _limit: "1",
                },
            }),
            headers: this.headers,
        })
    }

    getTerms(): Observable<IMainPage | null> {
        return this.mainStore.terms$.pipe(
            first(),
            switchMap((page) =>
                page
                    ? of(page)
                    : this.http.get<IMainPage>(`${this.apiUrl}/pages`, {
                          params: new HttpParams({
                              fromObject: {
                                  "menu_item.route": "app-terms",
                                  _limit: "1",
                              },
                          }),
                          headers: {
                              "Content-Type": "application/json",
                              "X-Nettest-Client": "nt",
                          },
                      })
            ),
            catchError(() => of(null)),
            tap((page) => {
                if (!page) {
                    return
                }
                const termsVersion = page?.updated_at
                    ? new Date(page?.updated_at).getTime()
                    : 0
                const translatedTermsVersion = page?.translations.length
                    ? page.translations
                          .map((t) =>
                              t.updated_at
                                  ? new Date(t.updated_at).getTime()
                                  : 0
                          )
                          .sort((a, b) => b - a)?.[0]
                    : 0
                page!.version = Math.max(termsVersion, translatedTermsVersion)
                this.mainStore.terms$.next(page)
            })
        )
    }
}
