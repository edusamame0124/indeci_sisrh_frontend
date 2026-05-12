# IndeciFrontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command from this directory:

```bash
ng test
```

Coverage (requiere `@vitest/coverage-v8` ya en el proyecto):

```bash
npm run test:coverage
```

> **Nota:** En algunos entornos, si `ng test` falla con “Vitest failed to find the runner”, ejecuta los comandos anteriores **desde la carpeta `indeci_frontend`** (no solo con `npm --prefix` desde la raíz) y verifica que `angular.json` tenga `"runner": "vitest"` en `architect.test.options`.

## Auth feature (001-frontend-auth)

Flujo de inicio de sesión, OTP, enroll, cambio de contraseña forzado y refresh transparente bajo `src/app/features/auth/`. Rutas bajo `/auth/*` (CSR).

- **Especificación y validación manual:** ver [specs/001-frontend-auth/quickstart.md](../specs/001-frontend-auth/quickstart.md) en la raíz del monorepo (backend, proxy, escenarios US1–US4).
- **Copy revisado (es-PE):** [docs/auth-copy-review.md](docs/auth-copy-review.md).
- **E2E / a11y:** Playwright en `e2e/` (`playwright.config.ts`). Incluye `a11y-auth.spec.ts` (axe-core). Ejecución típica (con servidor en marcha o vía `webServer` del config):

```bash
npx playwright test
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
