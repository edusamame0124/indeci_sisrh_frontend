import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportMasivaIr4ta } from './import-masiva-ir4ta';

describe('ImportMasivaIr4ta', () => {
  let component: ImportMasivaIr4ta;
  let fixture: ComponentFixture<ImportMasivaIr4ta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportMasivaIr4ta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportMasivaIr4ta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
