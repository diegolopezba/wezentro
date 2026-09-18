# Que "Soy empresa" no quede pegado

Hoy, cuando alguien toca "Soy empresa" o un botón de la landing comercial, se guarda una marca permanente en el navegador. Esa marca solo se borra al terminar todo el asistente de negocio. Si la persona cierra la app, vuelve atrás o simplemente estaba curioseando, la marca sigue ahí: el siguiente registro crea una cuenta Business y el siguiente inicio de sesión lo manda al asistente de negocio, aunque nunca lo haya querido.

## Qué cambia

La intención de empresa pasa a ser temporal y solo vive mientras la persona sigue ese camino sin interrupciones:

- Se guarda solo para la pestaña/sesión actual, no para siempre. Al cerrar la app o abrirla de nuevo, ya no existe.
- Caduca sola a los 30 minutos sin avanzar.
- Se borra apenas la persona se sale del camino: si desde la pantalla de registro/ingreso vuelve atrás, va al inicio o navega a cualquier otra parte que no sea el registro, la verificación por código o el asistente de negocio.
- Se borra también al terminar el registro personal (ya se usó para llevar al asistente) y al terminar o abandonar el asistente de negocio.

## Qué NO cambia

- El camino completo sigue funcionando igual para quien sí quiere: landing → registro → perfil básico → asistente de negocio, incluyendo la vuelta del código de verificación por email (misma pestaña).
- Nada cambia para las cuentas Business existentes ni para el registro normal.
- No se toca el modelo de cuentas ni los permisos.

## Detalles técnicos

- `src/lib/businessIntent.ts`: reescribir el almacenamiento. Pasar de `localStorage` sin vencimiento a `sessionStorage` guardando `{ ts }`; `hasBusinessIntent()` devuelve `false` y limpia si pasaron más de 30 min. Se mantienen las mismas funciones exportadas (`setBusinessIntent`, `hasBusinessIntent`, `takeBusinessIntent`, `clearBusinessIntent`) más un `touchBusinessIntent()` que refresca la marca de tiempo al avanzar de paso.
- `src/pages/Auth.tsx`: `businessMode` sigue derivándose igual, pero se agrega limpieza al desmontar la pantalla sin haberse autenticado (volver atrás / navegar a otra ruta). El `accountType` enviado en el registro (línea ~206) queda intacto; simplemente dejará de estar activo en los casos accidentales.
- `src/pages/Onboarding.tsx` (~línea 187): usar `takeBusinessIntent()` en vez de `hasBusinessIntent()`, para consumir la marca al redirigir a `/business/setup`.
- `src/pages/BusinessSetup.tsx`: además de las dos llamadas actuales a `clearBusinessIntent()`, limpiar al salir con "Completar después" / botón atrás.
- Sin cambios de base de datos, rutas ni componentes de UI.
