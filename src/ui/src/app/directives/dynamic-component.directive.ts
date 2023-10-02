import {
    ComponentRef,
    Directive,
    Input,
    OnChanges,
    OnInit,
    SimpleChanges,
    Type,
    ViewContainerRef,
} from "@angular/core"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "../interfaces/dynamic-component.interface"

@Directive({
    selector: "[dynamicComponent]",
})
export class DynamicComponentDirective implements OnInit, OnChanges {
    @Input() dynamicComponent?: Type<IDynamicComponent>
    @Input() parameters?: IDynamicComponentParameters

    private component?: ComponentRef<IDynamicComponent>

    constructor(private container: ViewContainerRef) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (this.component) {
            this.component.setInput(
                "parameters",
                changes["parameters"].currentValue
            )
        }
    }

    ngOnInit(): void {
        if (!this.dynamicComponent) {
            return
        }
        this.container.clear()
        this.component = this.container.createComponent(this.dynamicComponent)
        if (this.parameters) {
            this.component.instance.parameters = this.parameters
        }
    }
}
