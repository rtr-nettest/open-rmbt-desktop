import { FormArray, FormControl } from "@angular/forms"

export enum ECertifiedLocationType {
    s1 = "s1",
    s2 = "s2",
    s3 = "s3",
    s4 = "s4",
}

export interface ICertifiedEnvForm {
    locationType: ECertifiedLocationType[]
    locationTypeOther: string | null
    typeText: string | null
    testDevice: string | null
    testPictures: Array<File>
}

export interface ICertifiedEnvFormControls {
    locationType: FormArray<FormControl<boolean>>
    locationTypeOther: FormControl<string | null>
    typeText: FormControl<string | null>
    testDevice: FormControl<string | null>
}
