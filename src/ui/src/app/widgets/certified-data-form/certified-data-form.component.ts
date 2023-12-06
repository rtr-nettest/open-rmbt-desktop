import { Component, OnInit } from "@angular/core"
import { FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms"

@Component({
    selector: "app-certified-data-form",
    templateUrl: "./certified-data-form.component.html",
    styleUrls: ["./certified-data-form.component.scss"],
})
export class CertifiedDataFormComponent implements OnInit {
    form?: FormGroup

    constructor(private fb: FormBuilder) {}

    ngOnInit(): void {
        this.form = this.fb.group({
            titlePrepend: new FormControl<string>(""),
            firstName: new FormControl<string>("", [Validators.required]),
            lastName: new FormControl<string>("", [Validators.required]),
            titleAppend: new FormControl<string>(""),
            address: new FormControl<string>("", [Validators.required]),
            firstCycle: new FormControl<boolean>(true, [Validators.required]),
        })
    }

    submit() {}
}
