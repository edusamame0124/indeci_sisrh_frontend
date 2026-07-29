/**
 * Normaliza el valor de foto de perfil que llega del backend (LegajoResumenDto.fotoPerfil,
 * byte[] serializado por Jackson como base64) a un data-URI listo para [src] de <img>.
 * Reutilizado por LegajoStateService (Legajo Personal) y MiLegajoPage (Mi legajo) para que
 * ambas pantallas muestren la MISMA foto que el empleado carga desde Mi Perfil.
 */
export function normalizarFotoPerfil(foto: string | null | undefined): string | null {
  if (!foto) {
    return null;
  }

  const value = foto.trim();

  if (!value) {
    return null;
  }

  // Ya viene lista para mostrar
  if (value.startsWith('data:image')) {
    return value;
  }

  // Ya viene como URL
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  // Base64 PNG
  if (value.startsWith('iVBOR')) {
    return `data:image/png;base64,${value}`;
  }

  // Base64 JPG/JPEG
  if (value.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${value}`;
  }

  // Base64 WEBP
  if (value.startsWith('UklGR')) {
    return `data:image/webp;base64,${value}`;
  }

  // Fallback: asumimos imagen PNG si parece base64
  if (/^[A-Za-z0-9+/=]+$/.test(value) && value.length > 100) {
    return `data:image/png;base64,${value}`;
  }

  return value;
}
