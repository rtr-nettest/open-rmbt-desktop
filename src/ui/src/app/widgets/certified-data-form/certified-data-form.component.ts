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
import { TestStore } from "src/app/store/test.store"

@Component({
    selector: "app-certified-data-form",
    templateUrl: "./certified-data-form.component.html",
    styleUrls: ["./certified-data-form.component.scss"],
})
export class CertifiedDataFormComponent implements OnInit, OnDestroy {
    @Output() formChange = new EventEmitter<ICertifiedDataForm | null>()
    form?: FormGroup<ICertifiedDataFormControls>
    private destroyed$ = new Subject()

    constructor(private fb: FormBuilder, private testStore: TestStore) {}

    ngOnDestroy(): void {
        this.destroyed$.next(void 0)
        this.destroyed$.complete()
    }

    ngOnInit(): void {
        const savedForm = this.testStore.certifiedDataForm$.value
        this.form = this.fb.group({
            titlePrepend: new FormControl(savedForm?.titlePrepend || ""),
            firstName: new FormControl(savedForm?.firstName || "", {
                nonNullable: true,
                validators: Validators.required,
            }),
            lastName: new FormControl(savedForm?.lastName || "", {
                nonNullable: true,
                validators: Validators.required,
            }),
            titleAppend: new FormControl(savedForm?.titleAppend || ""),
            address: new FormControl(savedForm?.address || "", {
                nonNullable: true,
                validators: Validators.required,
            }),
            isFirstCycle: new FormControl<boolean>(
                savedForm?.isFirstCycle || true,
                {
                    nonNullable: true,
                    validators: Validators.required,
                }
            ),
        })
        this.form.valueChanges
            .pipe(
                map((f) => {
                    if (this.form?.valid) {
                        this.formChange.emit(f as ICertifiedDataForm)
                    } else {
                        this.formChange.emit(null)
                    }
                }),
                takeUntil(this.destroyed$)
            )
            .subscribe()
    }
}
