import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartTestButtonComponent } from './start-test-button.component';

describe('StartTestButtonComponent', () => {
  let component: StartTestButtonComponent;
  let fixture: ComponentFixture<StartTestButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StartTestButtonComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartTestButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
