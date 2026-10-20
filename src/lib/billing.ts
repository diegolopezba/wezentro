import { z } from "zod";

export const billingSchema = z.object({
  legal_name: z.string().trim().min(3, "Escribe tu nombre legal o razón social").max(200),
  document_type: z.enum(["NIT", "CI"]),
  document_number: z.string().trim().toUpperCase().regex(/^[0-9]{4,20}(-[A-Z0-9]{1,4})?$/, "Ingresa un NIT o C.I. válido; incluye el complemento si corresponde"),
  phone: z.string().transform((v) => v.replace(/[\s()-]/g, "")).pipe(z.string().regex(/^\+?[0-9]{8,15}$/, "Ingresa un teléfono válido, con código de país si corresponde")),
});
export type BillingDetails = z.infer<typeof billingSchema>;
export const emptyBilling: BillingDetails = { legal_name: "", document_type: "CI", document_number: "", phone: "" };
export const hasCompleteBilling = (value: unknown): value is BillingDetails => billingSchema.safeParse(value).success;