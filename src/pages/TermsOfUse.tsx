import { motion } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsOfUse = () => {
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
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="font-brand text-xl font-bold text-foreground">Términos de Uso</h1>
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
            <h2 className="text-lg font-semibold text-foreground">1. Aceptación de los Términos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al acceder o utilizar la aplicación Zentro ("Servicio"), usted acepta estar sujeto a estos Términos de Uso ("Términos"). Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estos Términos se aplican a todos los visitantes, usuarios y otras personas que accedan o utilicen el Servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Descripción del Servicio</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro es una plataforma social para descubrir, crear y compartir eventos. El Servicio permite a los usuarios:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Crear y gestionar eventos públicos y privados</li>
              <li>Descubrir eventos cercanos y de interés</li>
              <li>Conectar con otros usuarios mediante seguimiento y mensajería directa</li>
              <li>Gestionar listas de invitados (guestlists) y reservaciones</li>
              <li>Acceder a funciones premium mediante suscripciones Business o Zentro Places</li>
              <li>Explorar negocios, restaurantes y lugares en el mapa</li>
              <li>Recibir notificaciones push sobre actividad social y eventos</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Registro y Cuenta</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para utilizar ciertas funciones del Servicio, debe registrarse y crear una cuenta. Al hacerlo, usted acepta:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Proporcionar información precisa, actual y completa</li>
              <li>Mantener la seguridad de su contraseña</li>
              <li>Aceptar la responsabilidad por todas las actividades bajo su cuenta</li>
              <li>Notificarnos inmediatamente sobre cualquier uso no autorizado</li>
              <li>Tener al menos 13 años de edad (o la edad mínima legal en su jurisdicción)</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de suspender o terminar su cuenta si se proporciona información falsa o se violan estos Términos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Contenido del Usuario</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Usted es responsable del contenido que publique en Zentro, incluyendo eventos, publicaciones, imágenes y mensajes ("Contenido del Usuario").
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al publicar contenido, usted nos otorga una licencia no exclusiva, mundial, libre de regalías para usar, modificar, mostrar y distribuir dicho contenido en relación con el Servicio.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Usted declara y garantiza que:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Es el propietario o tiene los derechos necesarios sobre el contenido</li>
              <li>El contenido no infringe derechos de terceros</li>
              <li>El contenido no viola ninguna ley aplicable</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Conducta Prohibida</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al utilizar Zentro, usted acepta NO:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Publicar contenido ilegal, difamatorio, obsceno, amenazante o discriminatorio</li>
              <li>Acosar, intimidar o amenazar a otros usuarios</li>
              <li>Suplantar la identidad de otra persona o entidad</li>
              <li>Publicar spam, publicidad no solicitada o contenido engañoso</li>
              <li>Intentar acceder a cuentas de otros usuarios sin autorización</li>
              <li>Usar el Servicio para actividades ilegales o fraudulentas</li>
              <li>Interferir con el funcionamiento del Servicio o sus sistemas de seguridad</li>
              <li>Crear eventos falsos o engañosos</li>
              <li>Recopilar información de otros usuarios sin su consentimiento</li>
              <li>Usar bots, scrapers u otras herramientas automatizadas sin autorización</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Eventos y Guestlists</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Como creador de eventos, usted es responsable de:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>La precisión de la información del evento</li>
              <li>El cumplimiento de las leyes locales aplicables</li>
              <li>La seguridad y conducta en sus eventos presenciales</li>
              <li>La gestión adecuada de su lista de invitados</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro no es responsable de los eventos creados por usuarios ni de las interacciones que ocurran en ellos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Mensajería y Privacidad de Comunicación</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro permite la comunicación directa entre usuarios registrados. Usted puede controlar quién puede iniciar conversaciones con usted mediante la configuración de privacidad de mensajes:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Todos:</strong> cualquier usuario registrado puede enviarle mensajes</li>
              <li><strong>Seguidores:</strong> solo usuarios que le siguen pueden iniciar conversaciones</li>
              <li><strong>Mutuos:</strong> solo usuarios que se siguen mutuamente pueden comunicarse</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Solo usuarios con sesión iniciada pueden verificar la configuración de mensajería de otros usuarios. La mensajería no está disponible para visitantes no registrados.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Suscripciones y Pagos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro ofrece suscripciones premium con funciones adicionales. Al suscribirse:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Autoriza cargos recurrentes según el plan seleccionado</li>
              <li>Acepta que las suscripciones se renuevan automáticamente</li>
              <li>Puede cancelar en cualquier momento desde la configuración de la cuenta</li>
              <li>No se realizarán reembolsos por períodos parciales</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los pagos se procesan a través de Stripe. Al realizar un pago, acepta los términos de servicio de Stripe.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Programa de Referidos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro ofrece un programa de referidos para usuarios con suscripciones Business o Zentro Places. Al participar:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Puede compartir su código de referido con otros usuarios</li>
              <li>Recibirá un mes gratis por cada usuario referido que complete su primer pago de suscripción Business o Zentro Places</li>
              <li>El máximo de meses gratuitos acumulables es de 5</li>
              <li>Las recompensas no son transferibles ni canjeables por dinero</li>
              <li>Nos reservamos el derecho de modificar o cancelar el programa en cualquier momento</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El abuso del programa de referidos, incluyendo la creación de cuentas falsas o prácticas fraudulentas, resultará en la pérdida de recompensas y posible terminación de la cuenta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Compras dentro de la Aplicación</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Algunas funciones pueden requerir compras dentro de la aplicación. Todas las compras son finales y no reembolsables, excepto cuando lo requiera la ley aplicable o las políticas de la tienda de aplicaciones correspondiente (Apple App Store o Google Play Store).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Propiedad Intelectual</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El Servicio y su contenido original (excluyendo el Contenido del Usuario), características y funcionalidad son propiedad de Zentro y están protegidos por derechos de autor, marcas registradas y otras leyes de propiedad intelectual.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No puede copiar, modificar, distribuir, vender o arrendar ninguna parte de nuestro Servicio o software sin autorización expresa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Terminación</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Podemos terminar o suspender su acceso al Servicio de inmediato, sin previo aviso, por cualquier motivo, incluyendo, pero no limitado a, violaciones de estos Términos.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Usted puede eliminar su cuenta en cualquier momento desde la sección de Ayuda y Soporte dentro de la aplicación, o contactándonos en zentro@gmail.com. La eliminación requiere verificación de contraseña para su seguridad. Tras la terminación, su derecho a usar el Servicio cesará inmediatamente y todos sus datos serán eliminados permanentemente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Limitación de Responsabilidad</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, ZENTRO NO SERÁ RESPONSABLE POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES O PUNITIVOS, INCLUYENDO PÉRDIDA DE DATOS, BENEFICIOS O INGRESOS, QUE RESULTEN DEL USO O LA IMPOSIBILIDAD DE USAR EL SERVICIO.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El Servicio se proporciona "tal cual" y "según disponibilidad" sin garantías de ningún tipo, ya sean expresas o implícitas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">13. Indemnización</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Usted acepta defender, indemnizar y mantener indemne a Zentro y sus afiliados de cualquier reclamación, daño, obligación, pérdida, responsabilidad, costo o deuda que surja de su uso del Servicio o violación de estos Términos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">14. Disputas</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cualquier disputa relacionada con estos Términos se resolverá mediante arbitraje vinculante, excepto cuando la ley lo prohíba. Usted renuncia al derecho de participar en demandas colectivas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">15. Modificaciones</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de modificar estos Términos en cualquier momento. Le notificaremos sobre cambios significativos mediante un aviso en la aplicación o por correo electrónico. El uso continuado del Servicio después de los cambios constituye su aceptación de los nuevos términos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">16. Ley Aplicable</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estos Términos se regirán e interpretarán de acuerdo con las leyes aplicables, sin tener en cuenta las disposiciones sobre conflictos de leyes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">17. Divisibilidad</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si alguna disposición de estos Términos se considera inválida o inaplicable, las disposiciones restantes continuarán en pleno vigor y efecto.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">18. Contacto</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si tiene preguntas sobre estos Términos de Uso, contáctenos en:
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

export default TermsOfUse;
