import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeletrabajoListPage } from './teletrabajo-list-page';

describe('TeletrabajoListPage', () => {
  let component: TeletrabajoListPage;
  let fixture: ComponentFixture<TeletrabajoListPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeletrabajoListPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TeletrabajoListPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
