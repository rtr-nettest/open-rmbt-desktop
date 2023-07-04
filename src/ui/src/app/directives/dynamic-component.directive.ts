import { Directive, Input, OnInit, Type, ViewContainerRef } from "@angular/core"
import {
    IDynamicComponent,
    IDynamicComponentParameters,
} from "../interfaces/dynamic-component.interface"

@Directive({
    selector: "[dynamicComponent]",
})
export class DynamicComponentDirective implements OnInit {
    @Input() dynamicComponent?: Type<IDynamicComponent>
    @Input() parameters?: IDynamicComponentParameters

    constructor(private container: ViewContainerRef) {}

    ngOnInit(): void {
        if (!this.dynamicComponent) {
            return
        }
        this.container.clear()
        const component = this.container.createComponent(this.dynamicComponent)
        if (this.parameters) {
            component.instance.parameters = this.parameters
        }
    }
}
