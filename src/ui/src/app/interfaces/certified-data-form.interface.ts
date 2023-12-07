import { FormControl } from "@angular/forms"

export interface ICertifiedDataForm {
    titlePrepend: string | null
    firstName: string
    lastName: string
    titleAppend: string | null
    address: string
    isFirstCycle: boolean
}

export interface ICertifiedDataFormControls {
    titlePrepend: FormControl<string | null>
    firstName: FormControl<string>
    lastName: FormControl<string>
    titleAppend: FormControl<string | null>
    address: FormControl<string>
    isFirstCycle: FormControl<boolean>
}
