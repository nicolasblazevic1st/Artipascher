"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  MAX_PHOTOS,
  MAX_PHOTO_SIZE_BYTES,
  validatePhotoFile,
} from "@/lib/demandes-validation";

interface Props {
  requestId: string;
  initialPhotos: string[];
  editable: boolean;
}

export default function ClientDemandePhotosPanel({
  requestId,
  initialPhotos,
  editable,
}: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const slotsLeft = useMemo(
    () => Math.max(0, MAX_PHOTOS - photos.length - pendingFiles.length),
    [photos.length, pendingFiles.length]
  );

  function clearPending() {
    previews.forEach((url) => URL.revokeObjectURL(url));
    setPendingFiles([]);
    setPreviews([]);
  }

  function handleRemoveExisting(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
    setError(null);
    setSuccess(null);
  }

  function handleAddFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;

    const next = [...pendingFiles];
    const nextPreviews = [...previews];
    let err: string | null = null;

    for (const file of Array.from(list)) {
      if (photos.length + next.length >= MAX_PHOTOS) {
        err = `Maximum ${MAX_PHOTOS} photos autorisées.`;
        break;
      }
      const fileError = validatePhotoFile(file);
      if (fileError) {
        err = fileError;
        break;
      }
      next.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }

    setPendingFiles(next);
    setPreviews(nextPreviews);
    setError(err);
    setSuccess(null);
    e.target.value = "";
  }

  function handleRemovePending(index: number) {
    URL.revokeObjectURL(previews[index]!);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (photos.length + pendingFiles.length < 1) {
      setError("Conservez au moins une photo.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.set("keep", JSON.stringify(photos));
    for (const file of pendingFiles) {
      formData.append("photos", file);
    }

    const res = await fetch(`/api/client/demandes/${requestId}/photos`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Mise à jour impossible.");
      return;
    }

    clearPending();
    setPhotos(data.photos ?? photos);
    setSuccess("Photos mises à jour.");
    router.refresh();
  }

  const dirty =
    pendingFiles.length > 0 ||
    photos.length !== initialPhotos.length ||
    photos.some((p, i) => p !== initialPhotos[i]);

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Photos du projet</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {photos.length + pendingFiles.length}/{MAX_PHOTOS} photos · max{" "}
            {MAX_PHOTO_SIZE_BYTES / 1024 / 1024} Mo chacune
          </p>
        </div>
        {editable && dirty && (
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="rounded-lg bg-client-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-client-700 disabled:opacity-50"
          >
            {loading ? "Enregistrement…" : "Enregistrer les photos"}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {photos.map((photo) => (
          <div key={photo} className="relative">
            <img
              src={photo}
              alt="Photo projet"
              className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
            />
            {editable && (
              <button
                type="button"
                onClick={() => handleRemoveExisting(photo)}
                className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white shadow hover:bg-red-700"
                aria-label="Retirer la photo"
              >
                ×
              </button>
            )}
          </div>
        ))}

        {previews.map((preview, index) => (
          <div key={preview} className="relative">
            <img
              src={preview}
              alt="Nouvelle photo"
              className="h-24 w-24 rounded-lg border border-dashed border-client-300 object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemovePending(index)}
              className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white shadow hover:bg-red-700"
              aria-label="Retirer la nouvelle photo"
            >
              ×
            </button>
          </div>
        ))}

        {editable && slotsLeft > 0 && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500 hover:border-client-400 hover:bg-client-50">
            <span className="text-lg font-semibold text-client-600">+</span>
            Ajouter
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp"
              multiple
              className="hidden"
              onChange={handleAddFiles}
            />
          </label>
        )}
      </div>

      {!editable && photos.length === 0 && (
        <p className="mt-2 text-sm text-slate-500">Aucune photo.</p>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {success && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}
    </div>
  );
}
