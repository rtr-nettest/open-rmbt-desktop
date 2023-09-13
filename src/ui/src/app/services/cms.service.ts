import { HttpClient, HttpParams } from "@angular/common/http"
import { Injectable } from "@angular/core"
import { Observable, of } from "rxjs"
import {
    catchError,
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
                map((projects) =>
                    projects.filter((p) => CLIENTS.includes(p.slug))
                )
            )
    }

    getProject(): Observable<IMainProject | null> {
        return this.mainStore.project$.pipe(
            first(),
            withLatestFrom(this.mainStore.env$),
            switchMap(([project, env]) =>
                env?.FLAVOR !== "ont"
                    ? of(null)
                    : project
                    ? of(project)
                    : this.http
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
            ),
            catchError(() => of(null))
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
}
