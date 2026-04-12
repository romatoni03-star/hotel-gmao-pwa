# Hotel Maintenance GMAO

## Enfoque de diseño elegido

Se ha implementado una línea **Mediterranean tectonic control**: una interfaz móvil con contraste alto, materiales cálidos minerales, bloques operativos compactos y una sensación de control calmado para entornos hoteleros de alta presión.

## Qué incluye

- Dashboard ligero con KPIs diarios
- Checklist diario por áreas críticas
- Registro de incidencias con prioridad y estado
- Órdenes de trabajo simplificadas
- Persistencia local con `localStorage`
- Funcionamiento offline con service worker
- Interfaz móvil primero, adaptable a tablet y desktop

## Estructura principal

```text
client/
  index.html
  public/
    icon.svg
    manifest.json
    sw.js
  src/
    App.tsx
    index.css
    main.tsx
    lib/
      hotel-gmao.ts
    pages/
      Home.tsx
ideas.md
PROJECT_NOTES.md
validation-notes.md
```

## Arquitectura mínima

| Capa | Rol |
|---|---|
| `Home.tsx` | Shell visual, navegación inferior y módulos operativos |
| `hotel-gmao.ts` | Tipos, datos semilla, lógica KPI y persistencia local |
| `main.tsx` | Bootstrap y registro del service worker |
| `public/sw.js` | Caché básica del shell para offline |
| `public/manifest.json` | Instalación PWA |

## Instrucciones de instalación

```bash
pnpm install
```

## Instrucciones de desarrollo

```bash
pnpm dev
```

## Build de producción

```bash
pnpm build
```

## Validación realizada

- Comprobación TypeScript completada
- Build de producción completada
- Validación visual del dashboard, checklist, incidencias y órdenes de trabajo en preview

## Notas de evolución

La app está preparada para añadir una capa de sincronización posterior sin alterar la UX base offline. Si más adelante se requiere multiusuario, auditoría o sincronización remota, convendría ampliar el proyecto a full-stack.
