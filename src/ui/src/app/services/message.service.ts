import { Injectable, NgZone } from "@angular/core"
import { MatSnackBar } from "@angular/material/snack-bar"
import { MatDialog } from "@angular/material/dialog"
import {
    ConfirmDialogComponent,
    ConfirmDialogOpts,
} from "../widgets/confirm-dialog/confirm-dialog.component"
import { TranslocoService } from "@ngneat/transloco"

@Injectable({
    providedIn: "root",
})
export class MessageService {
    constructor(
        private snackbar: MatSnackBar,
        private dialog: MatDialog,
        private ngZone: NgZone,
        private transloco: TranslocoService
    ) {}

    closeAllDialogs() {
        this.dialog.closeAll()
    }

    openSnackbar(text: string) {
        this.ngZone.run(() => {
            this.snackbar.open(this.transloco.translate(text), undefined, {
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
                .subscribe((result) => {
                    if (result?.confirmAction) {
                        onConfirm()
                    }
                })
        })
    }
}
