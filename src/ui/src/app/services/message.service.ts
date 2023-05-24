import { Injectable } from "@angular/core"
import { MatSnackBar } from "@angular/material/snack-bar"

@Injectable({
    providedIn: "root",
})
export class MessageService {
    constructor(private snackbar: MatSnackBar) {}

    openSnackbar(text: string) {
        this.snackbar.open(text, undefined, {
            duration: 3000,
            panelClass: ["app-snackbar"],
        })
    }
}
