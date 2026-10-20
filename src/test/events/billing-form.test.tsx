import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BillingForm } from "@/components/billing/BillingForm";

afterEach(cleanup);
describe("billing capture", () => {
  it("does not save when required legal identity is missing", async () => {
    const save = vi.fn();
    render(<BillingForm onSave={save} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
    expect(await screen.findAllByRole("alert")).toHaveLength(3);
    expect(save).not.toHaveBeenCalled();
  });
  it("saves legal full name, CI complement and phone for future purchases", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<BillingForm onSave={save} />);
    fireEvent.change(screen.getByLabelText("Nombre completo / Razón social"), { target: { value: "Juan Carlos Flores Quispe" } });
    fireEvent.change(screen.getByLabelText("Número de NIT o C.I."), { target: { value: "1234567-1A" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "70123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ legal_name: "Juan Carlos Flores Quispe", document_type: "CI", document_number: "1234567-1A", phone: "70123456" }));
  });
  it("keeps entered data available after a save failure", async () => {
    const save = vi.fn().mockRejectedValue(new Error("Intenta de nuevo"));
    render(<BillingForm initial={{ legal_name: "Empresa Bolivia SRL", document_type: "NIT", document_number: "123456789", phone: "70123456" }} onSave={save} />);
    fireEvent.click(screen.getByRole("button", { name: "Guardar datos" }));
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Nombre completo / Razón social")).toHaveValue("Empresa Bolivia SRL");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar datos" })).not.toBeDisabled());
  });
});