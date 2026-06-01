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
    'El DNI ya está registrado':
      'Ese DNI ya está registrado en el sistema. Verifique el número o edite la persona existente.',
    'El email ya está registrado':
      'Ese correo electrónico ya está registrado. Use otro correo o edite la persona existente.',
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
      'No tienes permisos para esta operación. Solicita rol SUPER_ADMIN o el permiso correspondiente si aplica.',
    'El nombre es obligatorio': 'El nombre es obligatorio.',
    'El nombre no debe superar 200 caracteres':
      'El nombre no debe superar 200 caracteres.',
    'Régimen pensionario no encontrado':
      'No encontramos el régimen pensionario seleccionado. Recarga el catálogo.',
    'Tipo de comisión AFP no encontrado':
      'No encontramos el tipo de comisión AFP seleccionado. Recarga el catálogo.',
    'CUSPP inválido':
      'El CUSPP debe tener exactamente 12 dígitos numéricos.',
    'El CUSPP es obligatorio para AFP':
      'El CUSPP es obligatorio cuando el régimen es AFP.',
    'El régimen pensionario es obligatorio': 'Selecciona un régimen pensionario.',
    'Pensión no encontrada': 'No encontramos el registro de pensión solicitado.',
    'Ya existe una pensión activa':
      'Este colaborador ya tiene una pensión activa. Edítala o desactívala antes de crear otra.',
    'Concepto de planilla no encontrado':
      'No encontramos el concepto de planilla solicitado o ya fue dado de baja.',
    'Ya existe un concepto de planilla activo con ese código':
      'Ya existe un concepto vigente con ese código. Usa otro código o edita el existente.',
    // ===== Spec 009 / T142 — flujo obligatorio mixto (PREREQUISITE_MISSING) =====
    PREREQUISITE_MISSING:
      'Faltan datos previos del empleado. Complete los pasos anteriores antes de continuar.',
    'Empleado sin puesto registrado':
      'Este empleado aún no tiene puesto laboral registrado. Complete "Puesto laboral" antes de continuar.',
    'Empleado sin cuenta bancaria registrada':
      'Este empleado aún no tiene cuenta bancaria registrada. Complete "Cuenta bancaria" antes de continuar.',
    'Empleado sin pensión registrada':
      'Este empleado aún no tiene configuración de pensión registrada. Complete "Configuración pensión" antes de continuar.',
    'Empleado sin planilla registrada':
      'Este empleado aún no tiene configuración de planilla registrada. Complete "Configuración planilla" antes de continuar.',
    'Empleado sin conceptos asignados':
      'Este empleado aún no tiene conceptos de planilla asignados. Asigne al menos un concepto antes de generar planilla.',
    // ===== Spec 009 / T159 — Módulo Planilla =====
    'Periodo no encontrado':
      'No encontramos el periodo solicitado o ya fue dado de baja.',
    'Ya existe un periodo activo con esa clave':
      'Ya existe un periodo registrado con esa clave (YYYY-MM). Edita el existente o usa otra clave.',
    'Periodo cerrado':
      'El periodo está cerrado. Reábrelo desde "Periodos" para registrar movimientos o generar planilla.',
    'Periodo ya cerrado':
      'Este periodo ya está cerrado.',
    'Periodo ya abierto':
      'Este periodo ya está abierto.',
    'Movimientos pendientes impiden cerrar el periodo':
      'No se puede cerrar el periodo: existen movimientos en estado PENDIENTE. Procesa o anula los pendientes desde "Movimientos".',
    'Movimiento no encontrado':
      'No encontramos el registro de planilla solicitado.',
    'Estado de movimiento inválido':
      'El estado solicitado no es válido. Usa PENDIENTE, PROCESADO, OBSERVADO o ANULADO.',
    'Fechas de periodo inválidas':
      'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
    'Formato de periodo inválido':
      'El periodo debe tener formato YYYY-MM (ej. 2026-05).',
    'Planilla ya generada':
      'Ya existe una planilla generada para este empleado en este periodo.',
    'Empleado sin datos para generar planilla':
      'No se puede generar planilla: faltan datos prerequisito del empleado (puesto, banco, pensión o planilla base).',
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

  /** Tras alta de usuario con clave temporal definida por TI. */
  adminUsuarioCreadoClaveTemporalOk(): string {
    return 'Usuario registrado. Comunique la clave temporal al titular por un canal seguro; deberá cambiarla en el primer ingreso.';
  }

  /**
   * Caso: sesión activa con bundle JS antiguo envía payload de pensión que ya no existe.
   * Backend devuelve 400 sin mensaje específico → UI sugiere recarga.
   */
  pensionFormatoLegacy(): string {
    return 'Actualice la página para usar el formulario más reciente de pensión.';
  }

  /** Retorna el mensaje UI traducido. Si no existe mapeo, devuelve un default genérico. */
  translate(rawMessage: string | null | undefined): string {
    if (!rawMessage) return this.defaultMessage();
    const trimmed = rawMessage.trim();
    const mapped = this.map[trimmed];
    if (mapped) return mapped;
    if (this.isInstitutionalBusinessMessage(trimmed)) return trimmed;
    return this.defaultMessage();
  }

  private defaultMessage(): string {
    return 'Ocurrió un problema. Inténtelo de nuevo más tarde.';
  }

  /** Mensajes de NegocioException ya en español claro — mostrar sin ocultar tras el mapa. */
  private isInstitutionalBusinessMessage(message: string): boolean {
    if (message.length < 4 || message.length > 220) return false;
    if (/exception|null pointer|stack trace|http\s*\d{3}/i.test(message)) return false;
    return /[áéíóúñÁÉÍÓÚÑ]/.test(message) || /\b(el|la|los|las|ya|no|debe|de|es|está)\b/i.test(message);
  }

  /** Retorna true si el mensaje crudo está mapeado (no es un default fallback). */
  isMapped(rawMessage: string | null | undefined): boolean {
    if (rawMessage == null) return false;
    const trimmed = rawMessage.trim();
    return trimmed in this.map || this.isInstitutionalBusinessMessage(trimmed);
  }
}
