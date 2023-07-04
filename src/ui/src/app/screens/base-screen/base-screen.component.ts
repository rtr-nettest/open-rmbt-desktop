import { Component, OnDestroy } from "@angular/core"
import { Subject, distinctUntilChanged, takeUntil, tap } from "rxjs"
import { MainStore } from "../../store/main.store"
import { MessageService } from "../../services/message.service"

@Component({
    template: ``,
})
export class BaseScreen implements OnDestroy {
    destroyed$ = new Subject<void>()
    error$ = this.mainStore.error$
        .pipe(
            distinctUntilChanged(),
            takeUntil(this.destroyed$),
            tap((error) => {
                if (error) {
                    this.message.openSnackbar(error.message)
                }
            })
        )
        .subscribe()

    constructor(
        protected mainStore: MainStore,
        protected message: MessageService
    ) {}

    ngOnDestroy(): void {
        this.destroyed$.next()
        this.destroyed$.complete()
    }
}
