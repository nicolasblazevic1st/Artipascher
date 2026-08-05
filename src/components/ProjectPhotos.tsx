interface Props {
  photos: string[];
  /** Affiché sous le titre — précise que c’est public, sans crédit. */
  showPublicNote?: boolean;
}

/** Galerie photos du projet — visible sans déblocage ni crédit. */
export default function ProjectPhotos({ photos, showPublicNote = false }: Props) {
  if (!photos.length) return null;

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Photos du projet ({photos.length})
        </h2>
        {showPublicNote && (
          <p className="text-xs text-slate-500">
            Visibles librement — sans crédit
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {photos.map((photo) => (
          <a
            key={photo}
            href={photo}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-brand-300"
          >
            <img
              src={photo}
              alt="Photo du projet fournie par le particulier"
              className="h-28 w-28 object-cover sm:h-36 sm:w-36"
            />
          </a>
        ))}
      </div>
    </section>
  );
}
