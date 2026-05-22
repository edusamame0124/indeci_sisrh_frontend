import { describe, expect, it, beforeEach } from 'vitest';

import { TestBed } from '@angular/core/testing';

import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { provideRouter } from '@angular/router';

import { DashboardHomePageComponent } from './dashboard-home-page.component';

import { AuthService } from '../../../../core/services/auth.service';



describe('DashboardHomePageComponent', () => {

  beforeEach(() => {

    TestBed.configureTestingModule({

      imports: [DashboardHomePageComponent],

      providers: [

        provideAnimationsAsync('noop'),

        provideRouter([]),

        {

          provide: AuthService,

          useValue: {

            username: () => 'usuario.prueba',

            roles: () => ['RRHH_ADMIN'],

            permisos: () => [],

          },

        },

      ],

    });

  });



  it('muestra bienvenida institucional, usuario y roles', () => {

    const fixture = TestBed.createComponent(DashboardHomePageComponent);

    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement as HTMLElement;

    const text = el.textContent ?? '';

    expect(text).toContain('Portal de Recursos Humanos');

    expect(text).toContain('INDECI');

    expect(text).toContain('usuario.prueba');

    expect(text).toContain('RRHH_ADMIN');

    expect(text).toContain('Accesos directos');

  });



  it('muestra tarjetas alineadas al menú: Empleados accesible y Administración bloqueada para RRHH_ADMIN', () => {

    const fixture = TestBed.createComponent(DashboardHomePageComponent);

    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement as HTMLElement;



    expect(el.querySelector('a[href="/empleados/personas"]')).not.toBeNull();

    expect(el.querySelector('a[href="/planilla/periodos"]')).not.toBeNull();

    expect(el.querySelector('a[href="/catalogos/bancos"]')).not.toBeNull();



    const locked = el.querySelectorAll('.dashboard__card--locked');

    const lockedText = Array.from(locked).map((n) => n.textContent ?? '').join(' ');

    expect(lockedText).toContain('Administración');

    expect(lockedText).toContain('Reportes');

  });



  it('tarjetas bloqueadas no reciben foco por teclado', () => {

    const fixture = TestBed.createComponent(DashboardHomePageComponent);

    fixture.detectChanges();

    const locked = fixture.nativeElement.querySelector('.dashboard__card--locked') as HTMLElement;

    expect(locked?.getAttribute('tabindex')).toBe('-1');

    expect(locked?.getAttribute('aria-disabled')).toBe('true');

  });

});


