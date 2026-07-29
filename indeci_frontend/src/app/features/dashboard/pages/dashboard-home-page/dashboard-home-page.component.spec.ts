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



  // RBAC V012_45: RRHH_ADMIN quedó acotado a Catálogos y Reportes. Vinculación
  // pasó al rol VINCULACION y Planilla al rol PLANILLA.
  it('tarjetas alineadas al menú: RRHH_ADMIN accede a Catálogos, no a Empleados ni Planilla', () => {

    const fixture = TestBed.createComponent(DashboardHomePageComponent);

    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement as HTMLElement;



    expect(el.querySelector('a[href="/catalogos/bancos"]')).not.toBeNull();

    expect(el.querySelector('a[href="/empleados/personas"]')).toBeNull();

    expect(el.querySelector('a[href="/planilla/periodos"]')).toBeNull();



    const locked = el.querySelectorAll('.dashboard__card--locked');

    const lockedText = Array.from(locked).map((n) => n.textContent ?? '').join(' ');

    expect(lockedText).toContain('Administración');

  });



  it('tarjetas bloqueadas no reciben foco por teclado', () => {

    const fixture = TestBed.createComponent(DashboardHomePageComponent);

    fixture.detectChanges();

    const locked = fixture.nativeElement.querySelector('.dashboard__card--locked') as HTMLElement;

    expect(locked?.getAttribute('tabindex')).toBe('-1');

    expect(locked?.getAttribute('aria-disabled')).toBe('true');

  });

});


