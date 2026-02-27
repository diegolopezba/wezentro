import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, Mail, MessageCircle, HelpCircle, Shield, CreditCard, Calendar, Users, ChevronRight, FileText, Trash2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const Help = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (!password.trim()) {
      setPasswordError("Ingresa tu contraseña");
      return;
    }
    
    setIsDeleting(true);
    setPasswordError("");
    
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { password },
      });
      
      if (error) {
        setPasswordError("Error al eliminar la cuenta");
        return;
      }
      
      if (data?.error) {
        if (data.error === "Invalid password") {
          setPasswordError("Contraseña incorrecta");
        } else {
          setPasswordError(data.error);
        }
        return;
      }
      
      toast.success("Cuenta eliminada correctamente");
      setDeleteDialogOpen(false);
      await signOut();
      navigate("/auth");
    } catch (error) {
      setPasswordError("Error al eliminar la cuenta");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      setPassword("");
      setPasswordError("");
    }
  };

  const faqItems = [
    {
      question: "¿Cómo creo un evento?",
      answer: "Toca el botón '+' en la barra de navegación inferior. Completa el título, descripción, fecha, ubicación y categoría. Puedes añadir una imagen y activar la guestlist o tickets con precio."
    },
    {
      question: "¿Qué es la guestlist?",
      answer: "La guestlist te permite controlar quién asiste a tu evento. Los usuarios solicitan unirse y tú apruebas o rechazas. Puedes establecer un límite de capacidad y ver quién asistió."
    },
    {
      question: "¿Cómo funcionan las reservas?",
      answer: "Los negocios con reservas activadas aparecen en el mapa. Puedes reservar mesa desde su perfil eligiendo fecha, hora y número de personas. El negocio recibe la solicitud y puede confirmar o cancelar."
    },
    {
      question: "¿Cómo controlo quién me puede escribir?",
      answer: "Ve a Configuración > Privacidad. Puedes elegir que solo te escriban 'Todos', 'Seguidores' o 'Seguidores mutuos'. Solo usuarios con sesión iniciada pueden ver esta preferencia."
    },
    {
      question: "¿Cómo sigo a otros usuarios?",
      answer: "Visita el perfil de cualquier usuario y toca 'Seguir'. Verás sus eventos y publicaciones en tu feed principal."
    },
    {
      question: "¿Puedo editar o eliminar mis eventos?",
      answer: "Sí, ve a tu perfil y toca el evento que deseas modificar. Encontrarás opciones para editar los detalles o eliminarlo."
    },
    {
      question: "¿Cómo funciona una Cuenta Business?",
      answer: "Cualquier usuario puede convertir su cuenta en Business de forma gratuita desde Configuración. Las cuentas Business pueden activar reservas de mesa, añadir un menú, aparecer en el mapa y gestionar sus eventos de forma profesional."
    },
    {
      question: "¿Cómo guardo eventos?",
      answer: "Toca el icono de marcador en cualquier evento para guardarlo. Accede a todos tus guardados en Configuración > Guardados."
    },
    {
      question: "¿Cómo invito amigos a Zentro?",
      answer: "Ve a Configuración > Invitar Amigos para obtener tu código de referido único. Cuando un amigo se suscribe usando tu código, ambos reciben un beneficio en su próxima renovación."
    }
  ];

  const helpTopics = [
    {
      icon: Calendar,
      title: "Eventos",
      description: "Crear, editar y gestionar eventos"
    },
    {
      icon: Users,
      title: "Comunidad",
      description: "Seguir usuarios y conectar"
    },
    {
      icon: CreditCard,
      title: "Suscripciones",
      description: "Planes y pagos"
    },
    {
      icon: Shield,
      title: "Privacidad",
      description: "Mensajería y configuración"
    }
  ];

  const legalLinks = [
    {
      icon: FileText,
      title: "Términos de Uso",
      path: "/terms"
    },
    {
      icon: Shield,
      title: "Política de Privacidad",
      path: "/privacy-policy"
    }
  ];

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
          <h1 className="font-brand text-xl font-bold text-foreground">Ayuda y Soporte</h1>
        </div>
      </header>

      <div className="px-4 py-4 pb-8 space-y-6">
        {/* Quick Help Topics */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">Temas de Ayuda</h2>
          <div className="grid grid-cols-2 gap-3">
            {helpTopics.map((topic, index) => {
              const Icon = topic.icon;
              return (
                <motion.div
                  key={topic.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors cursor-pointer"
                >
                  <Icon className="w-5 h-5 text-primary mb-2" />
                  <h3 className="font-medium text-foreground text-sm">{topic.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{topic.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* FAQ Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" />
            Preguntas Frecuentes
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-xl px-4 bg-secondary/20"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.section>

        {/* Legal Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Privacidad y Términos
          </h2>
          <div className="space-y-2">
            {legalLinks.map((link) => {
              const Icon = link.icon;
              return (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  <span className="flex-1 text-foreground font-medium text-sm">{link.title}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </motion.section>


        {/* Contact Section */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            Contacto
          </h2>
          <div className="p-5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-muted-foreground text-sm mb-4">
              ¿No encontraste lo que buscabas? Escríbenos y te ayudaremos lo antes posible.
            </p>
            <a
              href="mailto:hello@zentro.com"
              className="flex items-center gap-3 p-4 rounded-xl bg-background/50 border border-border hover:bg-background/80 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Email de Soporte</p>
                <p className="text-sm text-primary">hello@zentro.com</p>
              </div>
            </a>
          </div>
        </motion.section>

        {/* Delete Account Section */}
        {user && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Eliminar Cuenta
            </h2>
            <div className="p-5 rounded-xl bg-destructive/5 border border-destructive/20">
              <p className="text-muted-foreground text-sm mb-4">
                Eliminar tu cuenta es una acción permanente. Se eliminarán todos tus datos, eventos, mensajes y contenido asociado. Esta acción no se puede deshacer.
              </p>
              <Dialog open={deleteDialogOpen} onOpenChange={handleDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar mi cuenta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Eliminar cuenta</DialogTitle>
                    <DialogDescription>
                      Esta acción es permanente y no se puede deshacer. Se eliminarán todos tus datos, incluyendo tu perfil, eventos creados, mensajes y todo el contenido asociado a tu cuenta.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="delete-password">Ingresa tu contraseña para confirmar</Label>
                      <Input
                        id="delete-password"
                        type="password"
                        placeholder="Tu contraseña"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError("");
                        }}
                        disabled={isDeleting}
                      />
                      {passwordError && (
                        <p className="text-sm text-destructive">{passwordError}</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => handleDialogOpenChange(false)}
                      disabled={isDeleting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || !password.trim()}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        "Eliminar cuenta"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </motion.section>
        )}

        {/* App Info */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center pt-4"
        >
          <p className="text-xs text-muted-foreground">
            Zentro v1.1.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © 2025 Zentro. Todos los derechos reservados.
          </p>
        </motion.section>
      </div>
    </AppLayout>
  );
};

export default Help;
