import { Component, EventEmitter, Output } from "@angular/core"
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from "@angular/forms"
import { Subject, map, takeUntil } from "rxjs"
import {
    ECertifiedLocationType,
    ICertifiedEnvForm,
    ICertifiedEnvFormControls,
} from "src/app/interfaces/certified-env-form.interface"
import { FileService } from "src/app/services/file.service"
import { TestStore } from "src/app/store/test.store"
import { v4 } from "uuid"

@Component({
    selector: "app-certified-env-form",
    templateUrl: "./certified-env-form.component.html",
    styleUrls: ["./certified-env-form.component.scss"],
})
export class CertifiedEnvFormComponent {
    @Output() formChange = new EventEmitter<ICertifiedEnvForm | null>()
    form?: FormGroup<ICertifiedEnvFormControls>
    locationValues = Object.values(ECertifiedLocationType)
    locationNames = [
        "Apartment building",
        "Single-family home",
        "Urban area",
        "Rural area",
        "Other",
    ]
    fileIds = [v4()]
    files: { [key: string]: File } = {}
    private destroyed$ = new Subject()

    constructor(
        private fb: FormBuilder,
        private fs: FileService,
        private ts: TestStore
    ) {}

    ngOnDestroy(): void {
        this.destroyed$.next(void 0)
        this.destroyed$.complete()
    }

    ngOnInit(): void {
        const savedForm = this.ts.certifiedEnvForm$.value
        this.form = this.fb.group({
            locationType: new FormArray<FormControl<boolean>>(
                Object.values(ECertifiedLocationType).map(
                    (_, i) =>
                        new FormControl(!!savedForm?.locationType[i], {
                            nonNullable: true,
                        })
                )
            ),
            locationTypeOther: new FormControl(
                savedForm?.locationTypeOther || "",
                Validators.required
            ),
            typeText: new FormControl(savedForm?.typeText || ""),
            testDevice: new FormControl(savedForm?.testDevice || ""),
        })
        this.toggleLocationTypeOther(true)
        this.form.valueChanges
            .pipe(
                map((f) => {
                    if (!f.locationType?.some((lt) => !!lt)) {
                        this.form?.markAsPristine()
                        this.formChange.emit(null)
                        return
                    }
                    if (this.form?.valid) {
                        const locationType =
                            f.locationType?.reduce(
                                (acc, lt, i) =>
                                    lt ? [...acc, this.locationValues[i]] : acc,
                                [] as ECertifiedLocationType[]
                            ) || []
                        const formValue: ICertifiedEnvForm = {
                            ...f,
                            testPictures: this.files,
                            locationType,
                        }
                        this.formChange.emit(formValue)
                    } else {
                        this.formChange.emit(null)
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

    async onFileSelected(event: Event, fileId: string) {
        const file = (event.target as HTMLInputElement).files![0]
        const compressed = await this.fs.compress(file)
        if (compressed) {
            if (!Object.hasOwn(this.files, fileId)) {
                this.fileIds.push(v4())
            }
            this.files[fileId] = compressed
        }
    }

    onFileUploadClick(uuid: string) {
        document.getElementById(uuid)?.click()
    }

    onDeleteFile(uuid: string) {
        delete this.files[uuid]
        if (this.fileIds.length > 1) {
            const uuidIndex = this.fileIds.findIndex(
                (fileId) => fileId === uuid
            )
            this.fileIds.splice(uuidIndex, 1)
        }
    }
}
