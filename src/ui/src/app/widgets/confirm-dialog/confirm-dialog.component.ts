import { Component, Inject } from "@angular/core"
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog"

@Component({
    selector: "app-confirm-dialog",
    templateUrl: "./confirm-dialog.component.html",
    styleUrls: ["./confirm-dialog.component.scss"],
})
export class ConfirmDialogComponent {
    get text() {
        return this.data.text
    }

    constructor(
        private dialogRef: MatDialogRef<any>,
        @Inject(MAT_DIALOG_DATA) private data: { text: string }
    ) {}

    close(confirmAction?: boolean) {
        this.dialogRef.close({ confirmAction })
    }
}
