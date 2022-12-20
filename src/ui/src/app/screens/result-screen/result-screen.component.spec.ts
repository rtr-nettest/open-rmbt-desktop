import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResultScreenComponent } from './result-screen.component';

describe('ResultScreenComponent', () => {
  let component: ResultScreenComponent;
  let fixture: ComponentFixture<ResultScreenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResultScreenComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResultScreenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
