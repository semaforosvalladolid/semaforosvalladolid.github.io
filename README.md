# Semáforos

PWA pública para consultar semáforos sobre OpenStreetMap. Cualquier visitante puede ver los semáforos publicados, su fase actual y la cuenta atrás. La edición queda bloqueada hasta iniciar sesión como administrador.

## Cómo funciona

- La web se publica gratis con GitHub Pages.
- Si `config.js` no tiene Supabase configurado, funciona en modo local con IndexedDB, como la primera versión.
- Si `config.js` tiene Supabase configurado, todos los usuarios leen los mismos semáforos desde la nube.
- Los visitantes no pueden crear, editar, mover ni borrar.
- El administrador desbloquea el modo editor tocando 5 veces sobre el título “Semáforos”.
- Cada semáforo guarda una fecha de inicio; por eso el ciclo sigue cuadrando aunque la web haya estado cerrada.

## Probar en Windows

```powershell
npm start
```

Abre `http://127.0.0.1:4173`.

Comprobaciones:

```powershell
npm test
npm run check
```

## Configurar Supabase

1. Crea un proyecto gratuito en Supabase.
2. En Supabase, entra en **SQL Editor**.
3. Copia y ejecuta el contenido de `supabase-schema.sql`.
4. En **Authentication → Users**, crea tu usuario administrador con email y contraseña.
5. Vuelve al **SQL Editor** y ejecuta la última consulta comentada de `supabase-schema.sql`, cambiando el email por el tuyo.
6. En **Project Settings → API**, copia:
   - Project URL
   - anon public key
7. Pega esos dos valores en `config.js`.

Importante: no pegues nunca la `service_role key` en la web. La clave correcta para `config.js` es la `anon public key`.

## Publicar en GitHub Pages

Sube los cambios al repositorio. El workflow de `.github/workflows/pages.yml` publicará la web automáticamente.

URL actual esperada:

`https://marcoprieto-kant.github.io/semaforos/`

## Usar como administrador

1. Abre la web.
2. Toca 5 veces el título “Semáforos”.
3. Introduce tu email y contraseña de Supabase.
4. Aparecerá la etiqueta “Editor”.
5. Ya puedes añadir, editar, mover y borrar semáforos.

## Aviso

Esta web es informativa y no oficial. Los tiempos pueden cambiar por sensores, tráfico, horarios, peatones o incidencias. No debe usarse para tomar decisiones de conducción o cruce.
