import { describe, expect, it, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { LoginPageComponent } from './login-page.component';
import { LoginFlowService } from '../../services/login-flow.service';
import { LoginFormComponent } from '../../components/login-form/login-form.component';

describe('LoginPageComponent (US1 integration)', () => {
  let httpMock: HttpTestingController;
  let flow: LoginFlowService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync('noop'),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    flow = TestBed.inject(LoginFlowService);
    // mockImplementation evita la navegación real (queremos verificar que se llamó, no actuar)
    vi.spyOn(flow, 'classifyAndRoute').mockImplementation(() => undefined);
    vi.spyOn(flow, 'handleError').mockImplementation(() => undefined);
  });

  it('on submit POSTs to /api/auth/login and routes via classifyAndRoute', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit({ username: 'jdoe', password: 'pass' });
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'jdoe', password: 'pass' });

    req.flush({
      token: 'temp-token',
      requiereOtp: true,
      requiereEnroll: false,
      newPass: 'N',
      roles: [],
      permisos: [],
    });

    expect(flow.classifyAndRoute).toHaveBeenCalledWith(
      expect.objectContaining({ requiereOtp: true }),
    );
  });

  it('preserves last username after error (FR-007, F3)', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit({ username: 'jdoe', password: 'wrong' });
    httpMock.expectOne('/api/auth/login').flush(
      { status: 400, mensaje: 'Credenciales inválidas', requiereCaptcha: false },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(fixture.componentInstance.lastUsername()).toBe('jdoe');
  });

  it('on network error preserves credentials and re-enables submit (red caída, F6 — T099)', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();

    const loginHost = fixture.debugElement.query(By.css('app-login-form'));
    expect(loginHost).toBeTruthy();
    const loginForm = loginHost!.componentInstance as LoginFormComponent;
    loginForm.form.setValue({ username: 'jdoe', password: 'secret-pass' });
    fixture.componentInstance.onSubmit({ username: 'jdoe', password: 'secret-pass' });
    httpMock.expectOne('/api/auth/login').flush('', { status: 0, statusText: 'Network error' });
    fixture.detectChanges();

    expect(fixture.componentInstance.errorMessage()).toBe(
      'Sin conexión. Verifique su red e intente nuevamente.',
    );
    expect(loginForm.form.value).toEqual({ username: 'jdoe', password: 'secret-pass' });
    expect(fixture.componentInstance.isSubmitting()).toBe(false);
    expect(loginForm.canSubmit()).toBe(true);
  });
});
