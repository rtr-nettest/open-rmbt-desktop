import { Component, Inject } from "@angular/core"
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog"

export type ConfirmDialogOpts = {
    canCancel: boolean
    proceedButtonText?: string
    cancelButtonText?: string
    okButtonText?: string
}

@Component({
    selector: "app-confirm-dialog",
    templateUrl: "./confirm-dialog.component.html",
    styleUrls: ["./confirm-dialog.component.scss"],
})
export class ConfirmDialogComponent {
    get text() {
        return this.data.text
    }

    get canCancel() {
        return this.data.canCancel ?? false
    }

    get proceedButtonText() {
        return this.data.proceedButtonText ?? "Abort measurement"
    }

    get cancelButtonText() {
        return this.data.cancelButtonText ?? "Cancel"
    }

    get okButtonText() {
        return this.data.okButtonText ?? "Ok"
    }

    constructor(
        private dialogRef: MatDialogRef<any>,
        @Inject(MAT_DIALOG_DATA)
        private data: { text: string } & ConfirmDialogOpts
    ) {}

    close(confirmAction?: boolean) {
        this.dialogRef.close({ confirmAction })
    }
}
