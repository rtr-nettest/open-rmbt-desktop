import { Pipe, PipeTransform } from "@angular/core"

@Pipe({
    name: "sprintf",
    standalone: false
})
export class SprintfPipe implements PipeTransform {
    transform(value: string, ...args: any[]): string {
        args.forEach((arg, i) => (value = value.replace(`%${i}`, arg)))
        return value
    }
}
