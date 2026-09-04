import { m } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsOfUse = () => {
  const navigate = useNavigate();
  const lastUpdated = "4 de septiembre de 2026";

  return (
    <AppLayout hideNav>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg safe-top">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="font-brand text-xl font-medium text-foreground">Términos de Uso</h1>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-80px)]">
        <m.div
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
              Zentro es una plataforma social para descubrir, crear y compartir eventos y experiencias. El Servicio permite a los usuarios:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Descubrir eventos, publicaciones y experiencias cercanas y de interés</li>
              <li>Crear y gestionar eventos públicos</li>
              <li>Comprar entradas por categorías (tiers) y lounges/áreas con plano visual del local</li>
              <li>Reservar mesas y experiencias en negocios afiliados</li>
              <li>Recibir invitaciones especiales gratuitas mediante enlaces del organizador</li>
              <li>Conectar con otros usuarios mediante seguimiento e interacciones sociales</li>
              <li>Contactar a negocios mediante el número de teléfono que estos publican voluntariamente</li>
              <li>Gestionar listas de invitados (guestlists) y reservaciones</li>
              <li>Operar cuentas Business con planes Básico, Profesional y Elite/Premium</li>
              <li>Impulsar publicaciones mediante sponsored posts</li>
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
              <li>Tener al menos 18 años de edad. Zentro está orientado a la vida nocturna y solo está disponible para personas mayores de edad.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Las cuentas Business son cuentas separadas con su propio inicio de sesión, distintas de las cuentas de usuario. Para vender entradas, lounges o experiencias con precio, la cuenta Business debe registrar obligatoriamente sus datos de beneficiario bancario dentro de la aplicación.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de suspender o terminar su cuenta si se proporciona información falsa o se violan estos Términos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Contenido del Usuario</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Usted es responsable del contenido que publique en Zentro, incluyendo eventos, publicaciones, imágenes y comentarios ("Contenido del Usuario").
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
            <h2 className="text-lg font-semibold text-foreground">6. Eventos, Guestlists, Reservaciones y Pagos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Como creador de eventos, usted es responsable de:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>La precisión de la información del evento</li>
              <li>El cumplimiento de las leyes locales aplicables</li>
              <li>La seguridad y conducta en sus eventos presenciales</li>
              <li>La gestión adecuada de su lista de invitados</li>
              <li>La configuración correcta de precios y categorías de entradas, así como la recepción de pagos si utiliza pagos QR</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los negocios con el sistema de reservaciones habilitado pueden configurar su horario de atención y una ventana horaria específica para aceptar reservas de mesa. Los horarios disponibles para los usuarios se limitan a los establecidos por el negocio. Zentro no es responsable de cancelaciones, no-shows ni disputas derivadas de las reservaciones.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Las experiencias son un tipo de publicación independiente que los negocios pueden crear y gestionar con sus propias reservas. Zentro no es responsable del contenido, calidad ni cumplimiento de las experiencias ofrecidas por los negocios.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro no es responsable de los eventos creados por usuarios ni de las interacciones que ocurran en ellos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6b. Pagos mediante Qhantuy y Cybersource</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro permite a negocios aceptar pagos por entradas, lounges/áreas, experiencias y suscripciones mediante códigos QR dinámicos integrados con Qhantuy, así como pagos con tarjeta a través de la pasarela externa Cybersource. Al utilizar esta funcionalidad:
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">Estructura de comisiones (entradas, lounges y experiencias):</p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>El 94% del precio de venta se distribuye al beneficiario bancario registrado por el negocio organizador</li>
              <li>Zentro retiene el 6% como comisión de plataforma</li>
              <li>Qhantuy cobra al comprador un cargo adicional de procesamiento del 1% sobre el precio de venta (pre-cargo), visible en el total antes de pagar</li>
              <li>Las suscripciones de planes Business se pagan íntegramente a Zentro</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium mt-2">Para negocios (organizadores):</p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Debe registrar sus datos de beneficiario y cuenta bancaria dentro de la aplicación para que Qhantuy pueda distribuir los pagos correctamente</li>
              <li>Es responsable de configurar correctamente sus datos bancarios en la aplicación</li>
              <li>El dinero es recibido y procesado por Qhantuy, que distribuye el 94% correspondiente al negocio y liquida los pagos al día hábil siguiente en la cuenta bancaria indicada por el organizador</li>
              <li>Es responsable de reembolsos y disputas de pago con sus clientes</li>
              <li>Debe cumplir con la normativa fiscal y tributaria boliviana aplicable</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium mt-2">Para usuarios (compradores):</p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>El pago se realiza desde su app bancaria al sistema de Qhantuy, o con tarjeta mediante Cybersource — Zentro no recibe ni retiene los fondos de la venta</li>
              <li>Qhantuy procesa el pago y, una vez confirmado, se emite automáticamente su entrada digital</li>
              <li>El cargo de procesamiento del 1% de Qhantuy se muestra en el resumen antes de confirmar el pago</li>
              <li>En caso de disputa de pago, debe contactar directamente al negocio organizador</li>
              <li>Zentro no es responsable por errores en el proceso de pago externo gestionado por Qhantuy o Cybersource</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro actúa exclusivamente como facilitador tecnológico y no es parte de la transacción comercial entre el negocio y el comprador. Qhantuy es el encargado de recibir, procesar y distribuir los fondos conforme a sus propios términos y condiciones.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6c. Múltiples categorías de entradas (Tiers)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los organizadores pueden configurar múltiples categorías de entradas dentro de un mismo evento (por ejemplo: "General", "VIP", "Early Bird"), cada una con su propio nombre, precio, capacidad y descripción.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro ofrece dos modalidades de venta:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li><strong>Todas a la vez:</strong> todas las categorías están disponibles simultáneamente y el comprador elige cuál adquirir.</li>
              <li><strong>Por orden:</strong> las categorías se desbloquean secuencialmente — la siguiente solo se habilita cuando la anterior se agota.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cada entrada queda asociada a una categoría específica. El nivel de acceso, beneficios y política de reembolso aplicables corresponden a la categoría adquirida. El organizador es responsable de honrar los beneficios y el nivel de acceso asociados a cada categoría.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Una vez que una categoría agota su capacidad, deja de estar disponible para nuevos compradores. Zentro no opera lista de espera (waitlist) para categorías agotadas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6d. Lounges y áreas con plano visual</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los organizadores pueden vender lounges, mesas o secciones de un evento mediante un plano visual del local. Para cada área, el organizador define su nombre, capacidad, precio, cantidad de entradas incluidas, descripción, beneficios e instrucciones de llegada.
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>El organizador puede configurar preguntas que el comprador debe responder al adquirir un lounge; las respuestas quedan registradas como parte de la reserva</li>
              <li>Las entradas incluidas en un lounge se agregan automáticamente a la lista de invitados del comprador</li>
              <li>Una vez vendido, un lounge deja de estar disponible para otros compradores</li>
              <li>El organizador es responsable de honrar la capacidad, beneficios y condiciones publicadas de cada área</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6e. Invitaciones especiales</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los organizadores pueden generar enlaces de invitación especial que otorgan entradas gratuitas identificadas con la etiqueta "INVITADO ESPECIAL". El organizador es el único responsable de la creación y distribución de estos enlaces y de a quiénes se los comparte. Zentro no controla ni garantiza la distribución de invitaciones realizada por los organizadores.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Contacto con Negocios</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              La mensajería directa dentro de la aplicación está deshabilitada. Los usuarios pueden contactar a los negocios mediante el número de teléfono que cada negocio publica voluntariamente en su perfil.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Al publicar un número de teléfono, el negocio acepta que este será visible públicamente para cualquier visitante. Las comunicaciones realizadas por teléfono o aplicaciones de terceros (por ejemplo, WhatsApp) ocurren fuera de Zentro y se rigen por los términos de dichos servicios; Zentro no es responsable de esas interacciones.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Suscripciones Business y Pagos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro ofrece planes de suscripción para cuentas Business — Básico, Profesional y Elite/Premium — con funciones adicionales según el nivel del plan. Al suscribirse:
            </p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Puede elegir facturación mensual o anual (la anual incluye un 5% de descuento)</li>
              <li>El acceso a las funciones premium requiere un plan activo y vigente</li>
              <li>Las suscripciones se renuevan de forma manual — no realizamos cobros automáticos recurrentes</li>
              <li>Tras la expiración del plan existe un período de gracia antes de perder el acceso a las funciones premium</li>
              <li>Puede gestionar o cancelar su suscripción contactándonos o desde la configuración de su cuenta</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Los pagos de suscripciones se procesan mediante Qhantuy (QR) o Cybersource (tarjeta). Al realizar un pago, acepta los términos de servicio del procesador correspondiente.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Política de reembolsos y cancelaciones</h2>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">Entradas a eventos (pagos QR mediante Qhantuy):</p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Los reembolsos son gestionados <strong>directamente por el negocio organizador</strong>. Zentro no es parte de la transacción y no procesa reembolsos.</li>
              <li>La política de reembolso aplicable a cada entrada (incluyendo entradas de distintas categorías) es la que defina el organizador del evento.</li>
              <li>Si un evento es cancelado por el organizador, el organizador es responsable de reembolsar a los compradores afectados.</li>
              <li>En caso de disputa, el comprador debe contactar primero al negocio organizador. Zentro puede facilitar la comunicación pero no garantiza un resultado específico.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium mt-2">Suscripciones Business (Qhantuy / Cybersource):</p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>No se realizan reembolsos por períodos parciales ya consumidos.</li>
              <li>Puede cancelar su suscripción en cualquier momento; mantendrá el acceso hasta el final del período pagado.</li>
              <li>El cargo de procesamiento de Qhantuy (1%) no es reembolsable una vez confirmado el pago.</li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium mt-2">Compras dentro de la aplicación (App Store / Play Store):</p>
            <ul className="text-sm text-muted-foreground leading-relaxed list-disc list-inside space-y-1">
              <li>Se rigen por las políticas de reembolso de Apple App Store o Google Play Store, según corresponda.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Programa de Referidos</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Zentro cuenta con infraestructura de seguimiento de referidos; sin embargo, el programa de recompensas está actualmente inactivo y no se otorgan beneficios por referidos en este momento.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de activar, modificar o cancelar el programa de referidos en cualquier momento, notificando los cambios en la aplicación. Cualquier abuso del sistema de referidos, incluyendo la creación de cuentas falsas o prácticas fraudulentas, resultará en la posible terminación de la cuenta.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">11. Compras dentro de la Aplicación</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Algunas funciones de suscripción pueden requerir compras dentro de la aplicación procesadas por Apple App Store o Google Play Store. Estas compras son finales y no reembolsables, excepto cuando lo requiera la ley aplicable o las políticas de la tienda correspondiente.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Las compras de entradas a eventos mediante pagos QR (Qhantuy) <strong>no</strong> son compras dentro de la aplicación: son transferencias bancarias directas entre el comprador y el negocio organizador, y no se realizan a través de las tiendas de aplicaciones.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">12. Propiedad Intelectual</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El Servicio y su contenido original (excluyendo el Contenido del Usuario), características y funcionalidad son propiedad de Zentro y están protegidos por derechos de autor, marcas registradas y otras leyes de propiedad intelectual.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              No puede copiar, modificar, distribuir, vender o arrendar ninguna parte de nuestro Servicio o software sin autorización expresa.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">13. Terminación</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Podemos terminar o suspender su acceso al Servicio de inmediato, sin previo aviso, por cualquier motivo, incluyendo, pero no limitado a, violaciones de estos Términos.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Usted puede eliminar su cuenta en cualquier momento desde la sección de Ayuda y Soporte dentro de la aplicación, o contactándonos en hello@zentro.com. La eliminación requiere verificación de contraseña para su seguridad. Tras la terminación, su derecho a usar el Servicio cesará inmediatamente y sus datos personales serán eliminados, salvo aquellos registros (como comprobantes de transacciones de entradas) que debamos conservar para cumplir con la normativa fiscal y legal aplicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">14. Limitación de Responsabilidad</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, ZENTRO NO SERÁ RESPONSABLE POR DAÑOS INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENTES O PUNITIVOS, INCLUYENDO PÉRDIDA DE DATOS, BENEFICIOS O INGRESOS, QUE RESULTEN DEL USO O LA IMPOSIBILIDAD DE USAR EL SERVICIO.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El Servicio se proporciona "tal cual" y "según disponibilidad" sin garantías de ningún tipo, ya sean expresas o implícitas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">15. Indemnización</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Usted acepta defender, indemnizar y mantener indemne a Zentro y sus afiliados de cualquier reclamación, daño, obligación, pérdida, responsabilidad, costo o deuda que surja de su uso del Servicio o violación de estos Términos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">16. Disputas</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cualquier disputa relacionada con estos Términos se resolverá mediante arbitraje vinculante, excepto cuando la ley lo prohíba. Usted renuncia al derecho de participar en demandas colectivas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">17. Modificaciones</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nos reservamos el derecho de modificar estos Términos en cualquier momento. Le notificaremos sobre cambios significativos mediante un aviso en la aplicación o por correo electrónico. El uso continuado del Servicio después de los cambios constituye su aceptación de los nuevos términos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">18. Ley Aplicable y Divisibilidad</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estos Términos se regirán e interpretarán de acuerdo con las leyes aplicables, sin tener en cuenta las disposiciones sobre conflictos de leyes.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si alguna disposición de estos Términos se considera inválida o inaplicable, las disposiciones restantes continuarán en pleno vigor y efecto.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">19. Contacto</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Si tiene preguntas sobre estos Términos de Uso, contáctenos en:
            </p>
            <div className="p-4 rounded-xl bg-secondary/30 border border-border">
              <p className="text-sm text-foreground font-medium">Zentro</p>
              <p className="text-sm text-primary">hello@zentro.com</p>
            </div>
          </section>
        </m.div>
      </ScrollArea>
    </AppLayout>
  );
};

export default TermsOfUse;
