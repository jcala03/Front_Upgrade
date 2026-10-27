import { brand } from "../../data/brand";
import "./LegalPage.css";

export const LegalPage = ({ terms = false }: { terms?: boolean }) => (
  <main className="legal-page container-wide">
    <nav aria-label="Navegación de la página legal"><a href="/">Volver al inicio</a><a href="/#contact">Volver al formulario</a></nav>
    {terms ? (
      <article aria-labelledby="terms-title">
        <h1 id="terms-title">Términos y Condiciones</h1>
        {/* Requiere contenido comercial aprobado antes de publicar el documento completo. */}
        <p>Estamos preparando este documento. Para consultar las condiciones aplicables a un producto o servicio, comunícate con Upgrade La 79 por <a href="https://wa.me/573023887034" target="_blank" rel="noreferrer">WhatsApp al {brand.phone}</a>.</p>
      </article>
    ) : (
    <article aria-labelledby="privacy-title">
      <h1 id="privacy-title">Política de Tratamiento de Datos Personales</h1>
      <p>Upgrade La 79 es responsable del tratamiento de los datos que suministras en el formulario de contacto del landing.</p>
      <h2>Qué datos compartes y para qué los usamos</h2>
      <p>Puedes indicar tu nombre, teléfono, vehículo, fecha y hora preferidas para una visita y, de forma opcional, el motivo de tu solicitud. Evita incluir información sensible o datos que no sean necesarios para atenderte.</p>
      <p>Usamos estos datos únicamente para gestionar tu solicitud, responderte, establecer comunicación contigo y dar seguimiento a tu consulta sobre los productos o servicios de Upgrade La 79. No vendemos tus datos personales.</p>
      <h2>Cómo funciona el contacto</h2>
      <p>Al aceptar la política y pulsar el botón de solicitud, se abre WhatsApp con un mensaje preparado a partir de tus datos. Tú decides si lo envías allí. La visita y el horario quedan sujetos a confirmación. El uso de WhatsApp está sujeto también a las políticas de ese servicio.</p>
      <h2>Tus derechos y cómo contactarnos</h2>
      <p>Puedes solicitar conocer, actualizar, rectificar o suprimir tus datos, según corresponda. Para ejercer estos derechos, contacta a Upgrade La 79 por <a href="https://wa.me/573023887034" target="_blank" rel="noreferrer">WhatsApp al {brand.phone}</a> e indica tu solicitud relacionada con tus datos personales.</p>
      <p>Ubicación publicada: {brand.location}.</p>
      {/* Completar internamente con razón social/nombre legal, NIT, dirección y correo oficial verificados. */}
    </article>
    )}
  </main>
);
