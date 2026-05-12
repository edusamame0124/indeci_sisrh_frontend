import type { ApiResponse } from '../models/api-response.model';

/** Extrae `data` de respuesta exitosa `ApiResponse<T>` (módulos rrhh/catalogos). */
export function extractApiData<T>(res: ApiResponse<T>): T {
  return res.data;
}
