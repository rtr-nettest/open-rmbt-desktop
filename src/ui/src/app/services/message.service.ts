import { Injectable } from "@angular/core"
import { MatSnackBar } from "@angular/material/snack-bar"
import { MatDialog } from "@angular/material/dialog"
import { ConfirmDialogComponent } from "../widgets/confirm-dialog/confirm-dialog.component"

@Injectable({
    providedIn: "root",
})
export class MessageService {
    constructor(private snackbar: MatSnackBar, private dialog: MatDialog) {}

    openSnackbar(text: string) {
        this.snackbar.open(text, undefined, {
            duration: 3000,
            panelClass: ["app-snackbar"],
        })
    }

    openConfirmDialog(text: string, onConfirm: () => void) {
        this.dialog
            .open(ConfirmDialogComponent, {
                data: {
                    text,
                },
            })
            .afterClosed()
            .subscribe(({ confirmAction }) => {
                if (confirmAction) {
                    onConfirm()
                }
            })
    }
}
