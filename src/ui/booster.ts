// Accent d'une extension (booster 3D, vignettes du sélecteur, onglets, bandeau de lancement).
// Le visuel du booster lui-même est dans src/ui/booster3d/.

/**
 * Style qui pose l'accent d'une extension : la variable --booster-accent-<id> de tokens.css
 * (repli : --booster-accent-defaut pour une extension sans accent défini).
 */
export function styleAccent(extensionId: string): string {
  const id = extensionId.replace(/[^a-z0-9-]/g, '');
  return `--booster-accent: var(--booster-accent-${id}, var(--booster-accent-defaut))`;
}
