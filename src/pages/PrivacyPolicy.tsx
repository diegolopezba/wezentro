import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const lastUpdated = "27 de febrero de 2026";

  return (
    <AppLayout hideNav>
      {/* Header */}
      <header className="sticky top-0 z-40 glass-strong safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-brand text-xl font-bold text-foreground">Política de Privacidad</h1>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-6 pb-12 space-y-6"
        >
          <p className="text-sm text-muted-foreground">
            Última actualización: {lastUpdated}
          </p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Introducción</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bienvenido a Zentro ("nosotros", "nuestro" o "la Aplicación"). Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información cuando utiliza nuestra aplicación móvil y servicios relacionados.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al utilizar Zentro, usted acepta las prácticas descritas en esta política. Si no está de acuerdo con esta política, por favor no utilice nuestra aplicación.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Información que Recopilamos</h2>
            
            <h3 className="text-base font-medium text-foreground">2.1 Información proporcionada por usted</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Información de registro: nombre, correo electrónico, nombre de usuario, fecha de nacimiento y género</li>
              <li>Información de perfil: foto de perfil, biografía e intereses</li>
              <li>Contenido generado: eventos, publicaciones, mensajes y comentarios</li>
              <li>Información de ubicación cuando crea eventos o utiliza funciones basadas en ubicación</li>
            </ul>

            <h3 className="text-base font-medium text-foreground">2.2 Información recopilada automáticamente</h3>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Información del dispositivo: modelo, sistema operativo, identificadores únicos</li>
              <li>Datos de uso: interacciones con la aplicación, eventos visualizados, funciones utilizadas</li>
              <li>Datos de ubicación: con su consentimiento, para mostrar eventos cercanos</li>
              <li>Información de registro: direcciones IP, tiempos de acceso, páginas visitadas</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Uso de la Información</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Utilizamos la información recopilada para:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Proporcionar, mantener y mejorar nuestros servicios</li>
              <li>Personalizar su experiencia y mostrar contenido relevante</li>
              <li>Procesar transacciones y gestionar suscripciones</li>
              <li>Enviar notificaciones sobre eventos, mensajes y actualizaciones</li>
              <li>Detectar y prevenir fraudes, spam y actividades maliciosas</li>
              <li>Cumplir con obligaciones legales</li>
              <li>Comunicarnos con usted sobre cambios en nuestros servicios</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Información Pública y Privada</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro es una red social pública. Parte de su información es visible para todos, incluyendo visitantes no registrados:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Información pública:</strong> nombre de usuario, nombre, foto de perfil, biografía, ciudad, eventos públicos que haya creado, seguidores, likes y reposts</li>
              <li><strong>Solo para usuarios registrados:</strong> su configuración de mensajería (quién puede escribirle) solo es visible para usuarios con sesión iniciada — los visitantes no registrados no pueden acceder a esta información</li>
              <li><strong>Solo para usted:</strong> sus mensajes privados, eventos guardados, reservaciones, datos de pago y preferencias de contenido</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No vendemos su información personal a terceros.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Compartir Información con Terceros</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Podemos compartir su información en las siguientes circunstancias:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Con otros usuarios:</strong> su perfil público y eventos son visibles según lo descrito en la sección 4</li>
              <li><strong>Proveedores de servicios:</strong> compartimos datos con terceros que nos ayudan a operar la aplicación (alojamiento, análisis, pagos)</li>
              <li><strong>Cumplimiento legal:</strong> cuando sea requerido por ley o para proteger nuestros derechos</li>
              <li><strong>Transferencia de negocio:</strong> en caso de fusión, adquisición o venta de activos</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Servicios de Terceros</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nuestra aplicación utiliza los siguientes servicios de terceros:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Infraestructura en la nube:</strong> para autenticación segura y almacenamiento de datos con cifrado en reposo</li>
              <li><strong>Stripe:</strong> para procesamiento de pagos de suscripciones — los datos de tarjetas nunca pasan por nuestros servidores</li>
              <li><strong>Mapbox:</strong> para servicios de mapas y ubicación</li>
              <li><strong>OneSignal:</strong> para notificaciones push — solo compartimos identificadores de dispositivo anonimizados</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada servicio tiene su propia política de privacidad que rige el uso de sus datos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Datos de Ubicación</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro recopila datos de ubicación para:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Mostrar eventos cercanos a usted</li>
              <li>Permitir la creación de eventos con ubicación</li>
              <li>Mostrar negocios de comida en el mapa (para usuarios Business)</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Puede desactivar el acceso a la ubicación en cualquier momento desde la configuración de su dispositivo. Sin embargo, algunas funciones pueden verse limitadas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Notificaciones Push</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Con su consentimiento, enviamos notificaciones push para informarle sobre:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Nuevos mensajes y solicitudes de chat</li>
              <li>Actualizaciones de eventos a los que asistirá</li>
              <li>Nuevos seguidores y actividad social</li>
              <li>Recordatorios de eventos próximos</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Puede gestionar sus preferencias de notificaciones desde la configuración de la aplicación o de su dispositivo.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Seguridad de Datos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Implementamos medidas de seguridad técnicas y organizativas para proteger su información, incluyendo:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Cifrado de datos en tránsito (HTTPS/TLS) y en reposo</li>
              <li>Controles de acceso a nivel de fila (Row-Level Security) — cada usuario solo puede acceder a sus propios datos privados</li>
              <li>La configuración de mensajería y preferencias privadas solo son accesibles para usuarios autenticados</li>
              <li>Los datos de pago (tarjetas) nunca son almacenados en nuestros servidores — son gestionados exclusivamente por Stripe</li>
              <li>Los tokens QR de guestlist son únicos y solo visibles para el titular y el organizador del evento</li>
              <li>Monitoreo regular de seguridad y auditorías de acceso</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sin embargo, ningún método de transmisión por Internet es 100% seguro. No podemos garantizar la seguridad absoluta de sus datos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Sus Derechos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Dependiendo de su ubicación, puede tener los siguientes derechos:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Acceso:</strong> solicitar una copia de sus datos personales</li>
              <li><strong>Rectificación:</strong> corregir información inexacta</li>
              <li><strong>Eliminación:</strong> solicitar la eliminación de sus datos</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado</li>
              <li><strong>Oposición:</strong> oponerse al procesamiento de sus datos</li>
              <li><strong>Restricción:</strong> limitar cómo usamos sus datos</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para ejercer estos derechos, contáctenos en zentro@gmail.com.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Eliminación de Cuenta</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Puede eliminar su cuenta y datos personales en cualquier momento desde la sección de Ayuda y Soporte dentro de la aplicación. La eliminación requiere verificación de su contraseña para garantizar su seguridad. También puede contactarnos en zentro@gmail.com. Tras la eliminación:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Sus datos personales serán eliminados de forma inmediata</li>
              <li>Se eliminarán todos sus eventos, mensajes, fotos y contenido asociado</li>
              <li>Esta acción es permanente e irreversible</li>
              <li>Algunos datos pueden retenerse para cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Privacidad de Menores</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro no está dirigido a menores de 13 años. No recopilamos intencionalmente información de niños menores de 13 años. Si descubrimos que hemos recopilado información de un menor, la eliminaremos de inmediato.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los usuarios entre 13 y 18 años deben tener el consentimiento de un padre o tutor para usar la aplicación.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Retención de Datos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Retenemos su información personal mientras su cuenta esté activa o según sea necesario para proporcionarle servicios. Podemos retener cierta información según lo requiera la ley o para fines comerciales legítimos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">13. Transferencias Internacionales</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sus datos pueden ser transferidos y procesados en países distintos al suyo. Nos aseguramos de que existan salvaguardas adecuadas para proteger su información de acuerdo con esta política.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">14. Cambios a esta Política</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Podemos actualizar esta política periódicamente. Le notificaremos sobre cambios significativos mediante un aviso en la aplicación o por correo electrónico. El uso continuado de Zentro después de los cambios constituye su aceptación de la política actualizada.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">15. Contacto</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si tiene preguntas sobre esta Política de Privacidad o nuestras prácticas de datos, contáctenos en:
            </p>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <p className="text-sm text-foreground font-medium">Zentro</p>
              <p className="text-sm text-primary">zentro@gmail.com</p>
            </div>
          </section>
        </motion.div>
      </ScrollArea>
    </AppLayout>
  );
};

export default PrivacyPolicy;
