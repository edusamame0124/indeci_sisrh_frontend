import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import type { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { PersonaPickerComponent } from './persona-picker.component';
import type { PersonaEmpleado } from '../../models/persona-empleado.model';

describe('PersonaPickerComponent', () => {
  let httpMock: HttpTestingController;

  const personas: readonly PersonaEmpleado[] = [
    {
      id: 1,
      empleadoId: 101,
      nombreCompleto: 'Abad Giron Ever',
      dni: '41868447',
      codigoInterno: 'EMP00399',
    },
    {
      id: 2,
      empleadoId: 202,
      nombreCompleto: 'Abregu Yataco Madeleine Felicia',
      dni: '46096439',
      codigoInterno: 'EMP00225',
    },
  ];

  function build() {
    TestBed.configureTestingModule({
      imports: [PersonaPickerComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PersonaPickerComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/rrhh/persona').flush({ data: personas });
    return fixture;
  }

  function selectionEvent(persona: PersonaEmpleado): MatAutocompleteSelectedEvent {
    return { option: { value: persona } } as MatAutocompleteSelectedEvent;
  }

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
  });

  it('permite buscar otra persona después de seleccionar y cambiar la primera', async () => {
    vi.useFakeTimers();
    const component = build().componentInstance;

    // Angular Material escribe la opción completa en el FormControl antes del evento.
    component.query.setValue(personas[0]);
    component.onSelectOption(selectionEvent(personas[0]));
    await vi.advanceTimersByTimeAsync(251);

    expect(component.query.value).toBe('');

    component.onCambiarPersona();
    component.query.setValue('46096439');
    await vi.advanceTimersByTimeAsync(251);

    expect(component.opciones()).toEqual([personas[1]]);
  });
});