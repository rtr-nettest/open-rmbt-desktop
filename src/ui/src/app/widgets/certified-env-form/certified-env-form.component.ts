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
import { CertifiedStore } from "src/app/store/certified.store"
import { TestStore } from "src/app/store/test.store"
import { v4 } from "uuid"

@Component({
    selector: "app-certified-env-form",
    templateUrl: "./certified-env-form.component.html",
    styleUrls: ["./certified-env-form.component.scss"],
    standalone: false,
})
export class CertifiedEnvFormComponent {
    @Output() formChange = new EventEmitter<ICertifiedEnvForm>()
    form?: FormGroup<ICertifiedEnvFormControls>
    disabled = true
    locationValues = Object.values(ECertifiedLocationType)
    locationNames = [
        "Apartment building",
        "Single-family home",
        "Urban area",
        "Rural area",
        "Other",
    ]
    fileIds = [v4()]
    private destroyed$ = new Subject()

    get files() {
        return this.store.files
    }

    constructor(
        private store: CertifiedStore,
        private fb: FormBuilder,
        private fs: FileService,
        private ts: TestStore,
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
                        }),
                ),
            ),
            locationTypeOther: new FormControl(
                {
                    value: savedForm?.locationTypeOther || "",
                    disabled: !savedForm?.locationType[4],
                },
                Validators.required,
            ),
            typeText: new FormControl(savedForm?.typeText || ""),
            testDevice: new FormControl(savedForm?.testDevice || ""),
        })
        this.form.controls.locationType.valueChanges
            .pipe(
                map(this.onCheckboxChange.bind(this)),
                takeUntil(this.destroyed$),
            )
            .subscribe()
        this.form.controls.locationTypeOther.valueChanges
            .pipe(
                map(this.onLocationTypeOtherChange.bind(this)),
                takeUntil(this.destroyed$),
            )
            .subscribe()
        this.form.controls.typeText.valueChanges
            .pipe(
                map(() => this.onFormChange()),
                takeUntil(this.destroyed$),
            )
            .subscribe()
        this.form.controls.testDevice.valueChanges
            .pipe(
                map(() => this.onFormChange()),
                takeUntil(this.destroyed$),
            )
            .subscribe()
        this.onCheckboxChange(this.form.controls.locationType.value)
        this.onLocationTypeOtherChange(
            this.form.controls.locationTypeOther.value,
        )
        this.initFiles()
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
                (fileId) => fileId === uuid,
            )
            this.fileIds.splice(uuidIndex, 1)
        }
    }

    private onFormChange() {
        const f = this.form?.value!
        const locationType =
            f.locationType?.map(
                (lt, i) => (lt ? this.locationValues[i] : null),
                [] as ECertifiedLocationType[],
            ) || []
        const formValue: ICertifiedEnvForm = {
            ...f,
            testPictures: this.files,
            locationType,
            isValid: this.form!.valid && !this.disabled,
        }
        this.formChange.emit(formValue)
    }

    private onLocationTypeOtherChange = (locationTypeOther: string | null) => {
        if (!this.form?.controls.locationType.value[4]) {
            return
        }
        this.disabled = !locationTypeOther
        this.onFormChange()
    }

    private onCheckboxChange = (boxes: boolean[]) => {
        if (boxes.some(Boolean)) {
            let isDisabled = false
            if (boxes[4]) {
                this.form?.controls.locationTypeOther.enable()
                isDisabled = !this.form?.controls.locationTypeOther.value
            } else {
                this.form?.controls.locationTypeOther.disable()
            }
            this.disabled = isDisabled
        } else {
            this.disabled = true
            this.form?.controls.locationTypeOther.disable()
        }
        this.onFormChange()
    }

    private initFiles() {
        if (Object.keys(this.files).length) {
            this.fileIds = []
            for (const fileId in this.files) {
                this.fileIds.push(fileId)
            }
            this.fileIds.push(v4())
        }
    }
}
