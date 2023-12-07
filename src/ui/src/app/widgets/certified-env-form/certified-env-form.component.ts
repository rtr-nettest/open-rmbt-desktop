import { Component, EventEmitter, Output } from "@angular/core"
import { FormArray, FormBuilder, FormControl, FormGroup } from "@angular/forms"
import { Subject, map, takeUntil } from "rxjs"
import {
    ECertifiedLocationType,
    ICertifiedEnvForm,
    ICertifiedEnvFormControls,
} from "src/app/interfaces/certified-env-form.interface"

@Component({
    selector: "app-certified-env-form",
    templateUrl: "./certified-env-form.component.html",
    styleUrls: ["./certified-env-form.component.scss"],
})
export class CertifiedEnvFormComponent {
    @Output() formChange = new EventEmitter<ICertifiedEnvForm | undefined>()
    form?: FormGroup<ICertifiedEnvFormControls>
    locationValues = Object.values(ECertifiedLocationType)
    locationNames = [
        "Apartment building",
        "Single-family home",
        "Urban area",
        "Rural area",
    ]
    private destroyed$ = new Subject()

    constructor(private fb: FormBuilder) {}

    ngOnDestroy(): void {
        this.destroyed$.next(void 0)
        this.destroyed$.complete()
    }

    ngOnInit(): void {
        this.form = this.fb.group({
            locationType: new FormArray<FormControl<boolean>>(
                Object.values(ECertifiedLocationType).map(
                    (_) => new FormControl(false, { nonNullable: true })
                )
            ),
            locationTypeOther: new FormControl(""),
            typeText: new FormControl(""),
            testDevice: new FormControl(""),
        })
        this.toggleLocationTypeOther(true)
        this.form.valueChanges
            .pipe(
                map((f) => {
                    if (this.form?.valid) {
                        console.log(this.form.value)
                        // this.formChange.emit(f as ICertifiedEnvForm)
                    }
                }),
                takeUntil(this.destroyed$)
            )
            .subscribe()
    }

    toggleLocationTypeOther(isEnabled: boolean) {
        if (isEnabled) {
            this.form?.controls.locationTypeOther.disable()
        } else {
            this.form?.controls.locationTypeOther.enable()
        }
    }
}
