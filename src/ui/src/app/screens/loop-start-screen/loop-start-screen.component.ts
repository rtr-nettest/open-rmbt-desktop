import { Component } from "@angular/core"
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ValidatorFn,
    Validators,
} from "@angular/forms"
import { map, withLatestFrom } from "rxjs"
import { MainStore } from "src/app/store/main.store"
import { TestStore } from "src/app/store/test.store"

type LoopForm = FormGroup<{
    interval: FormControl<number>
}>

// Only whole numbers are valid intervals (rejects e.g. 1.5).
const integerValidator: ValidatorFn = (control) => {
    const v = control.value
    if (v === null || v === undefined || v === "") {
        return null
    }
    return Number.isInteger(Number(v)) ? null : { integer: true }
}

@Component({
    selector: "app-loop-start-screen",
    templateUrl: "./loop-start-screen.component.html",
    styleUrls: ["./loop-start-screen.component.scss"],
    standalone: false
})
export class LoopStartScreenComponent {
    env$ = this.mainStore.env$.pipe(
        withLatestFrom(this.testStore.testIntervalMinutes$),
        map(([env, savedInterval]) => {
            const def: number = env!.LOOP_MODE_DEFAULT_INTERVAL
            const debug = !!env!.DEBUG
            // In debug mode the minimum-interval constraint is lifted: any
            // non-negative whole number is allowed (0 is valid — it means "wait
            // 5s between tests", see LoopService). Otherwise enforce the
            // configured min/max.
            this.min = debug ? 0 : env!.LOOP_MODE_MIN_INTERVAL
            this.max = env!.LOOP_MODE_MAX_INTERVAL
            const validators = debug
                ? [Validators.required, Validators.min(0), integerValidator]
                : [Validators.min(this.min), Validators.max(this.max)]
            this.form = this.fb.group({
                interval: new FormControl(savedInterval || def, validators),
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
