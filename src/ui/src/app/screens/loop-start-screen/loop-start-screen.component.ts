import { Component } from "@angular/core"
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms"
import { map, withLatestFrom } from "rxjs"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

type LoopForm = FormGroup<{
    interval: FormControl<number>
}>

@Component({
    selector: "app-loop-start-screen",
    templateUrl: "./loop-start-screen.component.html",
    styleUrls: ["./loop-start-screen.component.scss"],
})
export class LoopStartScreenComponent {
    env$ = this.mainStore.env$.pipe(
        withLatestFrom(this.testStore.testIntervalMinutes$),
        map(([env, savedInterval]) => {
            const def: number = env!.LOOP_MODE_DEFAULT_INTERVAL
            this.min = env!.LOOP_MODE_MIN_INTERVAL
            this.max = env!.LOOP_MODE_MAX_INTERVAL
            this.form = this.fb.group({
                interval: new FormControl(savedInterval || def, [
                    Validators.min(this.min),
                    Validators.max(this.max),
                ]),
            }) as LoopForm
            return env
        })
    )
    form?: LoopForm
    min?: number
    max?: number

    constructor(
        private testStore: TestStore,
        private mainStore: MainStore,
        private fb: FormBuilder
    ) {}

    onSubmit() {
        const interval = Number(this.form?.get("interval")?.value)
        if (interval >= 0) {
            this.testStore.launchLoopTest(interval)
        }
    }

    onFocus(event: any) {
        event.target.select()
    }
}
