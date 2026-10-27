# rbourree.github.io

Portfolio de Romain Bourrée, Fullstack & Product Engineer.

En ligne : https://rbourree.github.io/

## Stack

Site statique, sans build ni dépendance :

- `index.html` : contenu de la page
- `assets/styles.css` : styles (thème sombre, tokens en tête de fichier)
- `assets/main.js` : interactions (essaim d'agents en canvas, sections figées au scroll en `position: sticky`, apparitions via `IntersectionObserver`)
- `favicon.svg`, `og.png` : icône et aperçu pour les partages LinkedIn

Les polices viennent de Google Fonts. Les animations sont coupées si le système demande de réduire les mouvements (`prefers-reduced-motion`).

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Déploiement

GitHub Pages sert la branche `main`, à la racine. Chaque push sur `main` met le site à jour.

L'ancien site (template developerFolio) est archivé dans la branche `archive/developer-folio`.
