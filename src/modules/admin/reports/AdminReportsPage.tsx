import { BarChart3, Download } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { exportReport, reportLoaders } from "../../../api/reports";
import { listAllBranches } from "../../../api/branches";
import type { Branch } from "../../../types/branch";
import type { AnyReport, ReportFilters as Filters, ReportKind, ReportPaginator, ReportPeriod } from "../../../types/report";
import { hasPermission } from "../../../utils/authStorage";
import { ReportFilters } from "./ReportFilters";
import { ReportPagination } from "./ReportPagination";
import { ReportResults } from "./ReportResults";
import { defaultFilters, paginatorOf, reportLabels } from "./reportUtils";
import "./AdminReportsPage.css";

const kinds = Object.keys(reportLabels) as ReportKind[];
const periodOf = (report: AnyReport | null): ReportPeriod | null => report && "period" in report ? report.period ?? null : null;

const validateDates = (kind: ReportKind, filters: Filters) => {
  const from=String(filters.date_from??""),to=String(filters.date_to??"");
  if(kind==="receivables" && Boolean(from)!==Boolean(to)) return "Para filtrar cartera por fecha debes indicar Desde y Hasta.";
  if(!from&&!to) return "";
  if(!from||!to) return "Debes indicar Desde y Hasta.";
  const start=new Date(`${from}T00:00:00`),end=new Date(`${to}T00:00:00`);
  if(start>end) return "La fecha final debe ser igual o posterior a la fecha inicial.";
  if(Math.round((end.getTime()-start.getTime())/86_400_000)>365) return "El rango máximo para consulta es de 366 días.";
  return "";
};

export const AdminReportsPage = () => {
  const canView=hasPermission("reports.view");
  const [branches,setBranches]=useState<Branch[]>([]);
  const [kind,setKind]=useState<ReportKind>("sales");
  const [draft,setDraft]=useState<Filters>(()=>defaultFilters("sales"));
  const [applied,setApplied]=useState<Filters>(()=>defaultFilters("sales"));
  const [report,setReport]=useState<AnyReport|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [filterError,setFilterError]=useState("");
  const [retry,setRetry]=useState(0);
  const [exporting,setExporting]=useState(false);
  const [exportError,setExportError]=useState("");
  const requestId=useRef(0);

  useEffect(()=>{if(!canView)return;const controller=new AbortController();listAllBranches(controller.signal).then(setBranches).catch((cause)=>{if(!(cause instanceof DOMException&&cause.name==="AbortError"))setFilterError(cause instanceof Error?cause.message:"No se pudieron cargar las sedes.");});return()=>controller.abort();},[canView]);

  useEffect(()=>{
    if(!canView){setLoading(false);return;}
    const controller=new AbortController();
    const id=++requestId.current; setLoading(true); setError("");
    reportLoaders[kind](applied,controller.signal).then((value)=>{if(id===requestId.current)setReport(value);}).catch((cause)=>{if(!(cause instanceof DOMException&&cause.name==="AbortError")&&id===requestId.current)setError(cause instanceof Error?cause.message:"No se pudo cargar el reporte.");}).finally(()=>{if(id===requestId.current)setLoading(false);});
    return ()=>{requestId.current+=1;controller.abort();};
  },[applied,canView,kind,retry]);

  const selectKind=(next:ReportKind)=>{if(exporting||next===kind)return;requestId.current+=1;const branchId=applied.branch_id;const defaults={...defaultFilters(next),...(branchId?{branch_id:branchId}:{})};setKind(next);setDraft(defaults);setApplied(defaults);setReport(null);setFilterError("");setError("");setExportError("");};
  const apply=()=>{const validation=validateDates(kind,draft);setFilterError(validation);if(validation)return;setApplied({...draft,page:1});};
  const clear=()=>{const defaults=defaultFilters(kind);setDraft(defaults);setApplied(defaults);setFilterError("");};
  const page=(value:number)=>setApplied(current=>({...current,page:value}));
  const paginator=useMemo(()=>paginatorOf(report),[report]);
  const period=periodOf(report);
  const reportScope=report?.context.branch?.name??"Todas las sedes";
  const download=async()=>{if(exporting)return;setExporting(true);setExportError("");try{await exportReport(kind,applied);}catch(cause){setExportError(cause instanceof Error?cause.message:"No se pudo exportar el reporte.");}finally{setExporting(false);}};

  if(!canView)return <section className="reports-state reports-state--error"><strong>Acceso restringido</strong><p>No tienes permiso para consultar reportes.</p></section>;
  return <section className="admin-reports" aria-labelledby="reports-title">
    <header className="admin-reports__header"><div><span>Análisis operativo</span><h2 id="reports-title">Reportes</h2><p>Consulta y analiza la operación por periodos.</p></div><div className="admin-reports__actions">{period?<small>{reportScope} · {period.date_from} — {period.date_to} · Bogotá</small>:<small>{reportScope}</small>}<button type="button" disabled={exporting} onClick={()=>void download()}><Download size={17} aria-hidden="true" />{exporting?"Exportando…":"Exportar Excel"}</button></div></header>
    <div className="report-selector report-selector--desktop" aria-label="Seleccionar reporte">{kinds.map(item=><button type="button" key={item} disabled={exporting} aria-pressed={kind===item} onClick={()=>selectKind(item)}>{reportLabels[item]}</button>)}</div>
    <label className="report-selector-mobile">Reporte<select value={kind} disabled={exporting} onChange={(event)=>selectKind(event.target.value as ReportKind)}>{kinds.map(item=><option value={item} key={item}>{reportLabels[item]}</option>)}</select></label>
    <ReportFilters kind={kind} branches={branches} draft={draft} loading={loading} error={filterError} onChange={(key,value)=>setDraft(current=>({...current,[key]:value}))} onApply={apply} onClear={clear}/>
    {exportError?<p className="reports-export-error" role="alert">{exportError}</p>:null}
    {loading&&!report?<div className="reports-state" role="status"><BarChart3 aria-hidden="true"/><strong>Cargando reporte...</strong></div>:null}
    {error?<div className="reports-state reports-state--error" role="alert"><strong>No pudimos cargar el reporte</strong><p>{error}</p><button type="button" onClick={()=>setRetry(current=>current+1)}>Reintentar</button></div>:null}
    {report&&!error?<div className={loading?"report-content is-updating":"report-content"} aria-busy={loading}>{loading?<span className="report-content__loading" role="status">Actualizando reporte...</span>:null}<ReportResults kind={kind} report={report}/>{paginator?<ReportPagination paginator={paginator as ReportPaginator<unknown>} loading={loading} onPage={page}/>:null}</div>:null}
  </section>;
};
