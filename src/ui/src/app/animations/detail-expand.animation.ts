import { trigger, state, style, transition, animate } from '@angular/animations'

export const expandVertically = trigger('expandVertically', [
  state('false', style({height: '0px'})),
  state('true', style({height: '*'})),
  transition('true <=> false', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
])
