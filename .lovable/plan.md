# Foto obligatoria y onboarding Business sin género

## Resultado esperado
- Después de elegir el nombre de usuario, todas las cuentas nuevas verán un paso propio para subir su foto de perfil, con el mensaje: “Agregá tu foto de perfil para que la gente pueda encontrarte”. No habrá opción de omitirlo ni de avanzar hasta que la foto se haya subido correctamente.
- Las cuentas Business no verán ni tendrán que completar género ni fecha de nacimiento. Las cuentas personales seguirán completando esos datos.

## Cambios
1. Reordenar el onboarding común: usuario → foto → nombre para mostrar → datos personales solo para cuentas personales. Para Business, terminar después del nombre para mostrar y continuar al armado del negocio como hasta ahora. Ajustar títulos, progreso y botones según el recorrido.
2. Reutilizar la compresión y la carga de foto ya usadas al editar el perfil: seleccionar imagen, validar archivo, comprimir, subir y mostrar vista previa. Mostrar indicadores durante compresión, carga y guardado; impedir avances duplicados y explicar claramente los errores para poder reintentar. Guardar la URL de la foto junto al perfil antes de salir del onboarding.
3. Corregir “Editar perfil” para que una cuenta Business pueda guardar sus cambios sin introducir género o fecha de nacimiento y no vea esos campos. Mantener las validaciones existentes para las cuentas personales. Conservar el acceso actual de cuentas existentes; la nueva foto obligatoria se aplica al onboarding, sin bloquear retroactivamente a quienes ya usan la app.

## Detalles técnicos
- Cambios de interfaz y validación en `Onboarding.tsx` y `EditProfile.tsx`; usar el almacenamiento existente de imágenes y `avatar_url`, sin nuevas tablas ni cambiar el registro o los permisos.
- Mantener la distinción Business por intención de registro durante el onboarding y por perfil en edición. El control de acceso actual ya exime a Business de fecha de nacimiento y género.

## Verificación
- Probar registro personal y Business: no avanzar sin foto, indicador visible durante la carga, error recuperable, foto visible al terminar y navegación correcta.
- Comprobar que Business no recibe solicitudes de género o fecha de nacimiento ni al registrarse ni al editar su perfil; que las cuentas personales mantienen su validación; y revisar en teléfono y escritorio.
