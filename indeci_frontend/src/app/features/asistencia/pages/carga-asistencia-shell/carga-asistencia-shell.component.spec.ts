import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConsultaDiariaAsistenciaPageComponent } from '../consulta-diaria-asistencia-page/consulta-diaria-asistencia-page.component';
import { CargaAsistenciaPageComponent } from '../carga-asistencia-page/carga-asistencia-page.component';
import { JornadaRegimenConfigPageComponent } from '../jornada-regimen-config-page/jornada-regimen-config-page.component';
import { CargaMasivaCsvPageComponent } from '../carga-masiva-csv-page/carga-masiva-csv-page.component';
import { HistorialImportacionesPageComponent } from '../historial-importaciones-page/historial-importaciones-page.component';
import { CargaAsistenciaShellComponent } from './carga-asistencia-shell.component';

@Component({
  selector: 'app-consulta-diaria-asistencia-page',
  standalone: true,
  template: '<p>consulta diaria</p>',
})
class ConsultaDiariaAsistenciaPageStubComponent {}

@Component({
  selector: 'app-carga-asistencia-page',
  standalone: true,
  template: '<p>carga individual</p>',
})
class CargaAsistenciaPageStubComponent {}

@Component({
  selector: 'app-jornada-regimen-config-page',
  standalone: true,
  template: '<p>jornada</p>',
})
class JornadaRegimenConfigPageStubComponent {}

@Component({
  selector: 'app-carga-masiva-csv-page',
  standalone: true,
  template: '<p>carga masiva</p>',
})
class CargaMasivaCsvPageStubComponent {}

@Component({
  selector: 'app-historial-importaciones-page',
  standalone: true,
  template: '<p>historial</p>',
})
class HistorialImportacionesPageStubComponent {}

describe('CargaAsistenciaShellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargaAsistenciaShellComponent, NoopAnimationsModule],
      providers: [provideRouter([])],
    })
      .overrideComponent(CargaAsistenciaShellComponent, {
        remove: {
          imports: [
            CargaAsistenciaPageComponent,
            ConsultaDiariaAsistenciaPageComponent,
            JornadaRegimenConfigPageComponent,
            CargaMasivaCsvPageComponent,
            HistorialImportacionesPageComponent,
          ],
        },
        add: {
          imports: [
            CargaAsistenciaPageStubComponent,
            ConsultaDiariaAsistenciaPageStubComponent,
            JornadaRegimenConfigPageStubComponent,
            CargaMasivaCsvPageStubComponent,
            HistorialImportacionesPageStubComponent,
          ],
        },
      })
      .compileComponents();
  });

  it('renderiza las pestañas operativas de carga de asistencia', () => {
    const fixture = TestBed.createComponent(CargaAsistenciaShellComponent);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Consulta diaria de asistencia');
    expect(text).toContain('Asistencia por empleado');
    expect(text).toContain('Jornada y tolerancias');
    expect(text).toContain('Carga masiva CSV');
    expect(text).toContain('Historial de importaciones');
  });
});
