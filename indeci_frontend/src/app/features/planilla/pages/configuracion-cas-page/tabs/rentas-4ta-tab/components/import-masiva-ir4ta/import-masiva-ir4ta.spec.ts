import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMasivaIr4taComponent } from './import-masiva-ir4ta';

describe('ImportMasivaIr4taComponent', () => {
  let component: ImportMasivaIr4taComponent;
  let fixture: ComponentFixture<ImportMasivaIr4taComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportMasivaIr4taComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportMasivaIr4taComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
