import {
    Component,
    EventEmitter,
    OnDestroy,
    OnInit,
    Output,
} from "@angular/core"
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms"
import { Subject, map, takeUntil } from "rxjs"
import {
    ICertifiedDataForm,
    ICertifiedDataFormControls,
} from "src/app/interfaces/certified-data-form.interface"

@Component({
    selector: "app-certified-data-form",
    templateUrl: "./certified-data-form.component.html",
    styleUrls: ["./certified-data-form.component.scss"],
})
export class CertifiedDataFormComponent implements OnInit, OnDestroy {
    @Output() formChange = new EventEmitter<ICertifiedDataForm | undefined>()
    form?: FormGroup<ICertifiedDataFormControls>
    private destroyed$ = new Subject()

    constructor(private fb: FormBuilder) {}

    ngOnDestroy(): void {
        this.destroyed$.next(void 0)
        this.destroyed$.complete()
    }

    ngOnInit(): void {
        this.form = this.fb.group({
            titlePrepend: new FormControl(""),
            firstName: new FormControl("", {
                nonNullable: true,
                validators: Validators.required,
            }),
            lastName: new FormControl("", {
                nonNullable: true,
                validators: Validators.required,
            }),
            titleAppend: new FormControl(""),
            address: new FormControl("", {
                nonNullable: true,
                validators: Validators.required,
            }),
            isFirstCycle: new FormControl(true, {
                nonNullable: true,
                validators: Validators.required,
            }),
        })
        this.form.valueChanges
            .pipe(
                map((f) => {
                    if (this.form?.valid) {
                        this.formChange.emit(f as ICertifiedDataForm)
                    }
                }),
                takeUntil(this.destroyed$)
            )
            .subscribe()
    }
}
