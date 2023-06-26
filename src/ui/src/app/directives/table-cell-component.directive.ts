import { Directive, Input, OnInit, Type, ViewContainerRef } from "@angular/core"

@Directive({
    selector: "[appTableCellComponent]",
})
export class TableCellComponentDirective implements OnInit {
    @Input() appTableCellComponent?: Type<any>

    constructor(private container: ViewContainerRef) {}

    ngOnInit(): void {
        if (!this.appTableCellComponent) {
            return
        }
        this.container.clear()
        this.container.createComponent(this.appTableCellComponent)
    }
}
