import { apiDownload, apiRequest } from "./http";

export type CommercialDocumentKind = "quotation" | "sale";
export type CommercialDocumentScope = "admin" | "own";
export type CommercialDocument = {
  id: number; kind: "quotation" | "paid_sale" | "pending_order" | "order";
  code: string; filename: string; number: string; title: string;
  customer: { name: string; email: string | null; phone: string | null; city: string | null };
  can_email: boolean; email_simulated: boolean;
};
export function documentPath(kind: CommercialDocumentKind, scope: CommercialDocumentScope, id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Documento no válido.");
  const path = scope === "own" ? kind === "quotation" ? "my/quotations" : "my/sales" : kind === "quotation" ? "admin/quotations" : "admin/orders";
  return "/api/" + path + "/" + id;
}
export async function getCommercialDocument(kind: CommercialDocumentKind, scope: CommercialDocumentScope, id: number, signal?: AbortSignal) {
  return (await apiRequest<{ data: CommercialDocument }>(documentPath(kind, scope, id) + "/document", { signal })).data;
}
export const downloadCommercialDocument = (kind: CommercialDocumentKind, scope: CommercialDocumentScope, id: number, signal?: AbortSignal) =>
  apiDownload(documentPath(kind, scope, id) + "/pdf", {}, signal, "application/pdf, application/json");
export const emailCommercialDocument = (kind: CommercialDocumentKind, scope: CommercialDocumentScope, id: number, email: string, signal?: AbortSignal) =>
  apiRequest<{ message: string; data: { simulated: boolean; filename: string } }>(documentPath(kind, scope, id) + "/email", { method: "POST", body: { email }, signal });

/** Colombian mobile shorthand only; other destinations require an international prefix. */
export function whatsappNumber(value: string): string | null {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!/^(?:\+|00)?\d+$/.test(compact)) return null;
  let number = compact.replace(/^\+/, "").replace(/^00/, "");
  if (/^3\d{9}$/.test(number)) number = "57" + number;
  if (!/^[1-9]\d{10,14}$/.test(number)) return null;
  return number;
}
export function whatsappMessage(document: CommercialDocument) {
  return "Hola, " + document.customer.name + ". Te comparto " + document.title.toLowerCase() + " " + document.code
    + " de Upgrade La 79 (referencia " + document.number + "). Adjuntaré el PDF en este chat para que puedas revisar el detalle. Quedo atento a tus preguntas.";
}
