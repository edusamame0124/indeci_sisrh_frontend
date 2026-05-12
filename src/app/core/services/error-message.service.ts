import { Injectable } from '@angular/core';

/**
 * Mapeo de mensajes crudos del backend → mensaje al usuario en español Perú (FR-038, SC-004).
 * Centraliza la traducción para consistencia y facilita futura migración a @angular/localize.
 */
@Injectable({ providedIn: 'root' })
export class ErrorMessageService {
  private readonly map: Record<string, string> = {
    'Credenciales inválidas': 'Usuario o contraseña incorrectos',
    'Demasiados intentos, intenta luego':
      'Demasiados intentos. Espera 1 minuto e intenta nuevamente.',
    'Captcha inválido': 'No pudimos verificar que eres humano. Intenta otra vez.',
    'Usuario inactivo': 'Tu cuenta está inactiva. Contacta a Mesa de Ayuda.',
    'Código OTP inválido':
      'Código incorrecto. Verifica el dígito de tu app autenticadora.',
    'OTP no generado': 'La sesión expiró. Inicia sesión nuevamente.',
    'OTP ya está configurado': 'Ya tienes el segundo factor activo en otra sesión.',
    'Usuario ya cambió su contraseña':
      'Tu contraseña ya fue cambiada. Inicia sesión normalmente.',
    'Refresh inválido': 'Tu sesión expiró. Inicia sesión nuevamente.',
    'Refresh expirado': 'Tu sesión expiró. Inicia sesión nuevamente.',
    'Token inválido': 'Tu sesión expiró. Inicia sesión nuevamente.',
    'Debe validar OTP': 'Necesitas ingresar el código de verificación.',
    'Debe cambiar contraseña': 'Necesitas cambiar tu contraseña antes de continuar.',
    'El DNI es obligatorio': 'El DNI es obligatorio.',
    'Persona no encontrada': 'No encontramos el registro solicitado.',
    'Empleado no encontrado': 'No encontramos el registro de empleado solicitado.',
    'Sueldo básico inválido': 'El sueldo básico debe ser un monto válido mayor a cero.',
    'Ya existe planilla activa':
      'Esta persona ya tiene una planilla activa. Edítala o desactívala antes de crear otra.',
    'Planilla no encontrada': 'No encontramos el registro de planilla solicitado.',
    'Debe indicar el cargo': 'Debes ingresar el cargo del puesto.',
    'Puesto no encontrado': 'No encontramos el registro de puesto solicitado.',
    'Ya existe un banco activo con ese nombre':
      'Ya existe un banco vigente con ese nombre. Usa otro nombre o edita el existente.',
    'Ya existe un tipo de cuenta activo con ese nombre':
      'Ya existe un tipo de cuenta vigente con ese nombre. Usa otro nombre o edita el existente.',
    'Banco no encontrado': 'No encontramos el banco solicitado o ya fue dado de baja.',
    'Tipo de cuenta no encontrado':
      'No encontramos el tipo de cuenta solicitado o ya fue dado de baja.',
    'No tiene permisos para esta operación':
      'No tienes permisos para esta operación. Solicita rol ADMIN si corresponde.',
    'El nombre es obligatorio': 'El nombre es obligatorio.',
    'El nombre no debe superar 200 caracteres':
      'El nombre no debe superar 200 caracteres.',
  };

  /**
   * Cuando el backend aún no publica POST/PUT/DELETE de catálogos (BKD-001).
   */
  catalogosEscrituraNoDisponible(): string {
    return 'Esta acción no está disponible: el servidor aún no habilita el guardado de catálogos. Comunícate con el administrador del sistema.';
  }

  /** APIs administración `/api/admin/*` pueden no existir hasta autorización servidor (Spec 007). */
  translateAdminApi(rawMessage: string | null | undefined): string {
    if (!rawMessage) {
      return 'El servicio de administración no respondió correctamente (endpoints servidor pendientes). Comunícate con el equipo técnico.';
    }
    return this.translate(rawMessage);
  }

  /** Mensaje visible tras reset institucional (sin secreto usuario). */
  adminResetClaveMarcadoOk(): string {
    return 'Se marcó correctamente que el usuario deberá definir nueva clave al próximo ingreso (NEW_CLAVE). No se muestra contraseña en pantalla.';
  }

  /** Auditoría CSV export institucional. */
  auditoriaCsvExportLista(): string {
    return 'Descarga iniciada en tu navegador (máximo 500 filas según alcance institucional).';
  }

  /** Fallback si falla auditoría grande. */
  auditoriaCsvExportSinDatos(): string {
    return 'No hay filas disponibles para exportar con los filtros actuales.';
  }

  adminUsuarioEstadoActualizadoLista(): string {
    return 'Estado institucional del usuario actualizado.';
  }

  adminUsuarioRolesActualizadosLista(): string {
    return 'Roles institucionales del usuario actualizados.';
  }

  adminUsuarioDenegacionesLista(): string {
    return 'Denegaciones institucionales del usuario actualizadas.';
  }

  /** Retorna el mensaje UI traducido. Si no existe mapeo, devuelve un default genérico. */
  translate(rawMessage: string | null | undefined): string {
    if (!rawMessage) return 'Ocurrió un problema. Inténtalo de nuevo más tarde.';
    return this.map[rawMessage] ?? 'Ocurrió un problema. Inténtalo de nuevo más tarde.';
  }

  /** Retorna true si el mensaje crudo está mapeado (no es un default fallback). */
  isMapped(rawMessage: string | null | undefined): boolean {
    return rawMessage != null && rawMessage in this.map;
  }
}
