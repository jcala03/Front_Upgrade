import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import {
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { brand } from "../../../data/brand";
import { usePrefersReducedMotion } from "../../../hooks/usePrefersReducedMotion";
import "./Contact.css";

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;
const MAX_MONTH_OFFSET = 2;

type FieldName = "name" | "phone" | "vehicle" | "date" | "time";
type FormErrors = Partial<Record<FieldName, string>>;

const atStartOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const atStartOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date: Date, amount: number) =>
  new Date(date.getFullYear(), date.getMonth() + amount, 1);

const getMonthKey = (date: Date) =>
  date.getFullYear() * 12 + date.getMonth();

const isSameLocalDate = (first: Date, second: Date) =>
  first.getFullYear() === second.getFullYear() &&
  first.getMonth() === second.getMonth() &&
  first.getDate() === second.getDate();

const formatMonth = (date: Date) =>
  new Intl.DateTimeFormat("es-CO", {
    month: "long",
  }).format(date);

const formatYear = (date: Date) =>
  new Intl.DateTimeFormat("es-CO", { year: "numeric" }).format(date);

const formatDate = (date: Date, includeYear = true) =>
  new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(date);

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const localTime = new Date(2000, 0, 1, hours, minutes);

  return new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(localTime);
};

const buildWhatsAppUrl = (message: string) => {
  const whatsappUrl = new URL(brand.whatsappUrl);
  whatsappUrl.searchParams.set("text", message);
  return whatsappUrl.toString();
};

export const Contact = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const today = useMemo(() => atStartOfDay(new Date()), []);
  const firstAllowedMonth = useMemo(() => atStartOfMonth(today), [today]);
  const lastAllowedMonth = useMemo(
    () => addMonths(firstAllowedMonth, MAX_MONTH_OFFSET),
    [firstAllowedMonth],
  );
  const [viewMonth, setViewMonth] = useState(firstAllowedMonth);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [preferredTime, setPreferredTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasEntered, setHasEntered] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const monthDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const leadingEmptyDays = (new Date(year, month, 1).getDay() + 6) % 7;

    return {
      leadingEmptyDays,
      days: Array.from(
        { length: totalDays },
        (_, index) => new Date(year, month, index + 1),
      ),
    };
  }, [viewMonth]);

  const canGoPrevious =
    getMonthKey(viewMonth) > getMonthKey(firstAllowedMonth);
  const canGoNext = getMonthKey(viewMonth) < getMonthKey(lastAllowedMonth);
  const progressStep = preferredTime && selectedDate ? 3 : selectedDate ? 2 : 1;

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    if (
      prefersReducedMotion ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        setHasEntered(true);
        observer.disconnect();
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  const clearError = (field: FieldName) => {
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const selectDate = (date: Date) => {
    if (date < today) {
      return;
    }

    setSelectedDate(date);
    clearError("date");
  };

  const changeField =
    (
      field: FieldName,
      setter: Dispatch<SetStateAction<string>>,
    ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setter(event.target.value);
      clearError(field);
    };

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!name.trim()) nextErrors.name = "Escribe tu nombre.";
    if (!phone.trim()) nextErrors.phone = "Escribe un teléfono de contacto.";
    if (!vehicle.trim()) nextErrors.vehicle = "Indica qué vehículo traerás.";
    if (!selectedDate) {
      nextErrors.date = "Selecciona una fecha para tu visita.";
    } else if (selectedDate < today) {
      nextErrors.date = "La fecha seleccionada ya pasó.";
    }
    if (!preferredTime) nextErrors.time = "Indica una hora preferida.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm() || !selectedDate) {
      return;
    }

    const message = [
      "Hola, quiero solicitar una visita a Upgrade La 79.",
      "",
      `Fecha: ${formatDate(selectedDate)}`,
      `Hora preferida: ${formatTime(preferredTime)}`,
      `Nombre: ${name.trim()}`,
      `Teléfono: ${phone.trim()}`,
      `Vehículo: ${vehicle.trim()}`,
      `Motivo: ${reason.trim() || "No indicado"}`,
      "",
      "Quedo atento a la confirmación del horario.",
    ].join("\n");

    const newWindow = window.open(
      buildWhatsAppUrl(message),
      "_blank",
      "noopener,noreferrer",
    );

    if (newWindow) {
      newWindow.opener = null;
    }
  };

  return (
    <section
      ref={sectionRef}
      className={`section contact${hasEntered ? " is-visible" : ""}`}
      id="contact"
      aria-labelledby="contact-title"
    >
      <div className="container-wide contact__inner">
        <header className="contact__copy">
          <span className="section-kicker contact__eyebrow">Contacto</span>
          <h2 className="contact__title" id="contact-title">
            <span>Agenda tu</span>
            <span>llegada al</span>
            <span>taller.</span>
          </h2>
          <p>
            Selecciona el día y la hora que mejor te funcionen. Revisamos tu
            vehículo y definimos contigo el upgrade.
          </p>
        </header>

        <form className="contact__scheduler" onSubmit={handleSubmit} noValidate>
          <div className="contact__scheduler-head">
            <span>Recepción de vehículo</span>
            <small>Solicitud de ingreso</small>
          </div>

          <div
            className={`contact__progress contact__progress--step-${progressStep}`}
            role="progressbar"
            aria-label="Progreso de la solicitud de visita"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={progressStep}
          >
            <div className="is-active">
              <span>01</span>
              <small>Fecha</small>
            </div>
            <div className={progressStep >= 2 ? "is-active" : ""}>
              <span>02</span>
              <small>Hora</small>
            </div>
            <div className={progressStep >= 3 ? "is-active" : ""}>
              <span>03</span>
              <small>Datos</small>
            </div>
          </div>

          <section className="contact__calendar-section" aria-labelledby="contact-calendar-title">
            <div className="contact__step-heading">
              <span>01 / 03</span>
              <div>
                <p id="contact-calendar-title">Selecciona una fecha</p>
                <small>Solicitudes para los próximos tres meses.</small>
              </div>
            </div>

            <div className="contact__calendar">
              <div className="contact__calendar-toolbar">
                <strong aria-live="polite">
                  <span>{formatMonth(viewMonth)}</span>
                  <small>{formatYear(viewMonth)}</small>
                </strong>
                <div>
                  <button
                    type="button"
                    onClick={() => setViewMonth((current) => addMonths(current, -1))}
                    disabled={!canGoPrevious}
                    aria-label="Mostrar mes anterior"
                  >
                    <ChevronLeft aria-hidden="true" size={19} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth((current) => addMonths(current, 1))}
                    disabled={!canGoNext}
                    aria-label="Mostrar mes siguiente"
                  >
                    <ChevronRight aria-hidden="true" size={19} />
                  </button>
                </div>
              </div>

              <div className="contact__weekdays" aria-hidden="true">
                {WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              <div
                className="contact__days"
                key={`${viewMonth.getFullYear()}-${viewMonth.getMonth()}`}
              >
                {Array.from({ length: monthDays.leadingEmptyDays }, (_, index) => (
                  <span aria-hidden="true" key={`empty-${index}`} />
                ))}
                {monthDays.days.map((date) => {
                  const isPast = date < today;
                  const isToday = isSameLocalDate(date, today);
                  const isSelected =
                    selectedDate !== null && isSameLocalDate(date, selectedDate);

                  return (
                    <button
                      type="button"
                      className={`${isToday ? "is-today" : ""}${
                        isSelected ? " is-selected" : ""
                      }`}
                      key={date.getDate()}
                      disabled={isPast}
                      onClick={() => selectDate(date)}
                      aria-label={formatDate(date)}
                      aria-pressed={isSelected}
                    >
                      {date.getDate()}
                      {isToday ? (
                        <span className="contact__today-label" aria-hidden="true">
                          Hoy
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedDate ? (
              <div className="contact__selected-date" aria-live="polite">
                <span>Fecha seleccionada</span>
                <strong>{formatDate(selectedDate, false)}</strong>
              </div>
            ) : null}

            {errors.date ? (
              <p className="contact__error" id="contact-date-error" role="alert">
                {errors.date}
              </p>
            ) : null}
          </section>

          {selectedDate ? (
            <section className="contact__progressive contact__time-section">
              <div className="contact__step-heading">
                <span>02 / 03</span>
                <div>
                  <label htmlFor="contact-time">Horario preferido</label>
                  <small>Horario sujeto a confirmación.</small>
                </div>
              </div>
              <input
                id="contact-time"
                type="time"
                step="1800"
                value={preferredTime}
                onChange={changeField("time", setPreferredTime)}
                required
                aria-invalid={Boolean(errors.time)}
                aria-describedby={errors.time ? "contact-time-error" : undefined}
              />
              {errors.time ? (
                <p className="contact__error" id="contact-time-error" role="alert">
                  {errors.time}
                </p>
              ) : null}
            </section>
          ) : null}

          {preferredTime && selectedDate ? (
            <section className="contact__progressive contact__details">
              <div className="contact__step-heading">
                <span>03 / 03</span>
                <div>
                  <p>Datos del vehículo</p>
                  <small>Los usamos únicamente para solicitar esta visita.</small>
                </div>
              </div>

              <div className="contact__fields">
                <div className="contact__field">
                  <label htmlFor="contact-name">Nombre</label>
                  <input
                    id="contact-name"
                    autoComplete="name"
                    value={name}
                    onChange={changeField("name", setName)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "contact-name-error" : undefined}
                    required
                  />
                  {errors.name ? <p className="contact__error" id="contact-name-error">{errors.name}</p> : null}
                </div>

                <div className="contact__field">
                  <label htmlFor="contact-phone">Teléfono</label>
                  <input
                    id="contact-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={changeField("phone", setPhone)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? "contact-phone-error" : undefined}
                    required
                  />
                  {errors.phone ? <p className="contact__error" id="contact-phone-error">{errors.phone}</p> : null}
                </div>

                <div className="contact__field contact__field--wide">
                  <label htmlFor="contact-vehicle">Vehículo</label>
                  <input
                    id="contact-vehicle"
                    value={vehicle}
                    onChange={changeField("vehicle", setVehicle)}
                    aria-invalid={Boolean(errors.vehicle)}
                    aria-describedby={errors.vehicle ? "contact-vehicle-error" : undefined}
                    required
                  />
                  {errors.vehicle ? <p className="contact__error" id="contact-vehicle-error">{errors.vehicle}</p> : null}
                </div>

                <div className="contact__field contact__field--wide">
                  <label htmlFor="contact-reason">Motivo de la visita <span>(opcional)</span></label>
                  <textarea
                    id="contact-reason"
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
              </div>

              <div className="contact__summary" aria-live="polite">
                <span>Tu visita</span>
                <strong>{formatDate(selectedDate, false)}</strong>
                <strong>{formatTime(preferredTime)}</strong>
                {vehicle.trim() ? <p>{vehicle.trim()}</p> : null}
              </div>

              <button className="contact__submit" type="submit">
                Solicitar visita por WhatsApp
                <ArrowUpRight size={19} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <p className="contact__disclaimer">
                La visita queda sujeta a confirmación del taller.
              </p>
            </section>
          ) : null}
        </form>

        <div className="contact__secondary" aria-label="Información de contacto adicional">
          <span>{brand.location}</span>
          <a href={brand.instagramUrl} target="_blank" rel="noreferrer">Instagram</a>
          <a href={brand.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
        </div>
      </div>
    </section>
  );
};
