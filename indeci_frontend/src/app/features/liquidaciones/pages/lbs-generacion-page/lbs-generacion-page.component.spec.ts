import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LbsGeneracionPageComponent } from './lbs-generacion-page.component';

describe('LbsGeneracionPageComponent', () => {
  let component: LbsGeneracionPageComponent;
  let fixture: ComponentFixture<LbsGeneracionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LbsGeneracionPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LbsGeneracionPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
