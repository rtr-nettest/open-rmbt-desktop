import { Injectable, NgZone } from "@angular/core"
import { MatSnackBar } from "@angular/material/snack-bar"
import { MatDialog } from "@angular/material/dialog"
import {
    ConfirmDialogComponent,
    ConfirmDialogOpts,
} from "../widgets/confirm-dialog/confirm-dialog.component"

@Injectable({
    providedIn: "root",
})
export class MessageService {
    constructor(
        private snackbar: MatSnackBar,
        private dialog: MatDialog,
        private ngZone: NgZone
    ) {}

    openSnackbar(text: string) {
        this.ngZone.run(() => {
            this.snackbar.open(text, undefined, {
                duration: 3000,
                panelClass: ["app-snackbar"],
            })
        })
    }

    openConfirmDialog(
        text: string,
        onConfirm: () => void,
        options?: ConfirmDialogOpts
    ) {
        this.ngZone.run(() => {
            this.dialog
                .open(ConfirmDialogComponent, {
                    data: {
                        text,
                        ...options,
                    },
                })
                .afterClosed()
                .subscribe(({ confirmAction }) => {
                    if (confirmAction) {
                        onConfirm()
                    }
                })
        })
    }
}
