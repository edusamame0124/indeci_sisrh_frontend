import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LegajoListPage } from './legajo-list-page';

describe('LegajoListPage', () => {
  let component: LegajoListPage;
  let fixture: ComponentFixture<LegajoListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LegajoListPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LegajoListPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
