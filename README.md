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

Chaque push sur `main` déclenche le workflow `.github/workflows/pages.yml`, qui :

- date le sitemap et le champ `dateModified` des données structurées avec le dernier commit ;
- versionne les URL de `styles.css` et `main.js` avec le SHA du commit, pour contourner les caches ;
- publie le site sur GitHub Pages ;
- signale la mise à jour à Bing et aux moteurs compatibles via IndexNow (le fichier `<clé>.txt` à la racine sert de preuve).

Google n'accepte pas de signalement automatique : il relit `sitemap.xml`, déclaré dans Search Console.

L'ancien site (template developerFolio) est archivé dans la branche `archive/developer-folio`.
