import { Component, Input } from "@angular/core"
import { BehaviorSubject } from "rxjs"
import { IMainMenuItem } from "src/app/interfaces/main-menu-item.interface"

@Component({
    selector: "app-action-buttons",
    templateUrl: "./action-buttons.component.html",
    styleUrls: ["./action-buttons.component.scss"],
})
export class ActionButtonsComponent {
    @Input() items?: IMainMenuItem[]
    private disabledItems: Set<number> = new Set()
    disabledItems$: BehaviorSubject<Set<number>> = new BehaviorSubject(
        this.disabledItems
    )

    handleClick(event: MouseEvent, index: number) {
        event.preventDefault()
        event.stopPropagation()
        this.disabledItems.add(index)
        this.disabledItems$.next(this.disabledItems)
        this.items![index].action?.(event).subscribe(() => {
            this.disabledItems.delete(index)
            this.disabledItems$.next(this.disabledItems)
        })
    }
}
