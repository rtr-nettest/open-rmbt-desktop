import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InterimResultsComponent } from './interim-results.component';

describe('InterimResultsComponent', () => {
  let component: InterimResultsComponent;
  let fixture: ComponentFixture<InterimResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InterimResultsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InterimResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
