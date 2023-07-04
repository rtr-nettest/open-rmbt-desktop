import { trigger, style, transition, animate } from '@angular/animations'

export const openClose = trigger('openClose', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms', style({ opacity: 1 })),
  ]),
  transition(':leave', [animate('300ms', style({ opacity: 0 }))]),
])
