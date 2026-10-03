import {
    Component,
    HostListener,
    Input,
    ChangeDetectionStrategy,
} from "@angular/core"

@Component({
    selector: "app-scroll-bottom",
    templateUrl: "./scroll-bottom.component.html",
    styleUrls: ["./scroll-bottom.component.scss"],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false,
})
export class ScrollBottomComponent {
    @Input() isVisible = true
    @Input() scrollableSelector = ".app-article"

    handleClick(event: MouseEvent) {
        const body = document.querySelector(this.scrollableSelector)
        if (!body) {
            return
        }
        const lastP = document.querySelector(
            `${this.scrollableSelector}>p:last-of-type`,
        )
        lastP?.scrollIntoView({
            behavior: "smooth",
        })
    }
}
