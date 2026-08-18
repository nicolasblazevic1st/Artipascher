const j = await fetch(
  "https://recherche-entreprises.api.gouv.fr/search?q=" +
    encodeURIComponent("peinture") +
    "&departement=59&page=1&per_page=8&etat_administratif=A"
).then((r) => r.json());

for (const r of j.results || []) {
  const siret = r.siege?.siret || r.matching_etablissements?.[0]?.siret;
  const dirs = (r.dirigeants || []).slice(0, 3);
  if (!siret || dirs.length === 0) continue;
  console.log(
    JSON.stringify(
      {
        nom: r.nom_complet,
        siret,
        ville: r.siege?.libelle_commune,
        cp: r.siege?.code_postal,
        dirigeants: dirs.map((d: { nom?: string; prenoms?: string; qualite?: string; denomination?: string; type_dirigeant?: string }) => ({
          nom: d.nom,
          prenoms: d.prenoms,
          denomination: d.denomination,
          qualite: d.qualite,
          type: d.type_dirigeant,
        })),
      },
      null,
      2
    )
  );
  console.log("---");
}
