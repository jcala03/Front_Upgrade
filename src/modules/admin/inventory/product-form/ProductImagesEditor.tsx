import { useEffect, useRef, useState } from "react";
import { getProductImageUrl } from "../../../../utils/getProductImageUrl";

export type ImageDraft = { key: string; id?: number; file?: File; url: string; primary: boolean };

export const ProductImagesEditor = ({ images, onChange, published, disabled, error }: {
  images: ImageDraft[]; onChange: (images: ImageDraft[]) => void; published: boolean; disabled: boolean; error?: string;
}) => {
  const urls = useRef(new Set<string>());
  const [notice, setNotice] = useState("");
  useEffect(() => () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
  const add = (files: File[]) => {
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name) || file.size > 5 * 1024 * 1024)) {
      setNotice("Usa archivos JPEG, PNG o WEBP de hasta 5 MB. No se agregó ningún archivo de esta selección.");
      return;
    }
    setNotice("");
    const added = files.map((file, index) => {
      const url = URL.createObjectURL(file); urls.current.add(url);
      return { key: crypto.randomUUID(), file, url, primary: images.length === 0 && index === 0 };
    });
    onChange([...images, ...added]);
  };
  const remove = (image: ImageDraft) => {
    if (published && images.length === 1) { setNotice("No puedes quitar la última imagen de un producto publicado. Ocúltalo primero o agrega otra imagen."); return; }
    const remaining = images.filter((row) => row.key !== image.key);
    if (image.primary && remaining.length) remaining[0] = { ...remaining[0], primary: true };
    if (image.file) { URL.revokeObjectURL(image.url); urls.current.delete(image.url); }
    setNotice(""); onChange(remaining);
  };
  const move = (index: number, direction: number) => {
    const next = [...images]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(next);
  };
  return <section className="product-images-editor" aria-labelledby="product-images-title">
    <h3 id="product-images-title">Imágenes del producto</h3>
    <p>Para publicar necesitas una imagen principal. Las demás se muestran en la galería. JPEG, PNG o WEBP, hasta 5 MB por archivo.</p>
    <label className="smart-product-form__field"><span>Agregar imágenes</span><input data-error-key="gallery" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled} aria-invalid={Boolean(error)} aria-describedby="product-images-feedback" onChange={(event) => { add(Array.from(event.target.files ?? [])); event.target.value = ""; }} /></label>
    <p id="product-images-feedback" role={error || notice ? "alert" : "status"}>{error || notice || (images.length ? `${images.length} imágenes. Las existentes se conservan al guardar.` : "Sin imágenes. Solo puedes guardar el producto oculto.")}</p>
    <ol className="product-images-editor__list">{images.map((image, index) => <li key={image.key}>
      <img src={image.file ? image.url : getProductImageUrl(image.url)} alt={`Imagen ${index + 1} del producto`} />
      <strong>{image.primary ? "Principal" : `Adicional ${index + 1}`}</strong>
      <div><button type="button" disabled={disabled || image.primary} aria-label={`Usar imagen ${index + 1} como principal`} onClick={() => onChange(images.map((row) => ({ ...row, primary: row.key === image.key })))}>Hacer principal</button>
      <button type="button" disabled={disabled || index === 0} aria-label={`Mover imagen ${index + 1} antes`} onClick={() => move(index, -1)}>←</button>
      <button type="button" disabled={disabled || index === images.length - 1} aria-label={`Mover imagen ${index + 1} después`} onClick={() => move(index, 1)}>→</button>
      <button type="button" disabled={disabled} aria-label={`Quitar imagen ${index + 1}`} onClick={() => remove(image)}>Quitar</button></div>
    </li>)}</ol>
  </section>;
};
