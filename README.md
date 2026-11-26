# CiBé Clinique — site vitrine

Site officiel de CiBé Clinique, clinique privée à Bimbo 2, Bangui (RCA).
HTML, CSS et JavaScript natifs, sans framework ni dépendance : le site est léger
(environ 2,5 Mo d'images au total, polices auto-hébergées) pour rester rapide
sur les connexions mobiles de Bangui.

## Démarrer

Node.js 18 ou plus récent suffit, aucune installation de paquet n'est nécessaire.

```bash
npm run build   # génère le site dans dist/
npm run dev     # reconstruit à chaque modification + serveur sur http://localhost:4173
npm run serve   # construit puis sert dist/ sans surveillance
```

Pour mettre en ligne : envoyer **le contenu du dossier `dist/`** chez l'hébergeur
(FTP, cPanel, Netlify, Vercel…). `404.html`, `sitemap.xml` et `robots.txt` sont générés.

## Structure

```
cibe-clinique-web/
├── build.mjs              générateur statique (assemble gabarit + pages)
├── package.json
├── image/                 photos d'origine (non publiées, 154 Mo)
├── logo/                  logos d'origine
└── src/
    ├── site.json          coordonnées, réseaux sociaux, URL du site ← à modifier ici
    ├── layout.html        gabarit commun (<head>, SEO, données structurées)
    ├── partials/          en-tête, pied de page, icônes, symbole du logo
    ├── pages/             une page = un fichier
    │   ├── index.html     Accueil
    │   ├── clinique.html  La clinique
    │   ├── services.html  Nos services
    │   ├── patients.html  Votre visite (parcours, paiement, FAQ)
    │   ├── contact.html   Contact et demande de rendez-vous
    │   └── 404.html
    └── assets/
        ├── css/main.css   système de design (variables en tête de fichier)
        ├── js/main.js     menu, onglets, sommaire, formulaire
        ├── fonts/         Bricolage Grotesque + Figtree (licence OFL)
        ├── img/           photos optimisées en WebP (800 et 1600 px)
        └── logo/          logos SVG, favicon, icônes
```

### Modifier un contenu

- **Téléphone, e-mail, adresse, réseaux sociaux** : `src/site.json`, repris partout
  via `{{site.phone}}`, `{{site.email}}`, etc.
- **Texte d'une page** : `src/pages/<page>.html`. Le bloc `<!--meta {...} -->` en tête
  définit le titre, la description (SEO) et l'entrée de menu active.
- **Menu et pied de page** : `src/partials/header.html` et `footer.html`.
- **Couleurs, typographie, arrondis** : variables `:root` en tête de `main.css`.

### Ajouter une photo

Exporter en WebP en deux largeurs, `nom-800.webp` et `nom-1600.webp`, dans
`src/assets/img/`, puis utiliser `srcset` comme dans les pages existantes.

## Formulaire de rendez-vous

Le site est statique : par défaut, le bouton « Envoyer la demande » ouvre la messagerie
du visiteur avec la demande pré-remplie vers l'adresse de `site.json`.

Pour recevoir les demandes directement (sans messagerie côté visiteur), créer un
formulaire chez un service comme Formspree, Basin ou Getform, puis renseigner son URL
dans `"formEndpoint"` de `src/site.json`. Le script enverra alors les données en POST
et affichera la confirmation sur la page.

## Identité visuelle

| Rôle | Couleur |
| --- | --- |
| Bleu nuit (texte, fonds sombres) | `#003a76` |
| Bleu CiBé (actions, liens) | `#005cd5` |
| Vert vital (accents sur fond sombre) | `#00f389` |
| Soleil (appel, urgences) | `#f8b600` |

Typographies : **Bricolage Grotesque** (titres) et **Figtree** (texte).
Le motif principal reprend la grande courbe bleue du symbole CiBé, qui « entoure »
la personne, comme dans le logo.

## Accessibilité et performance

- Navigation complète au clavier, lien d'évitement, focus visible.
- Menu, sous-menu et onglets conformes aux motifs ARIA ; `Échap` ferme les menus.
- Animations désactivées si l'utilisateur a choisi de réduire les mouvements.
- Images en WebP avec `srcset`, chargement différé ; la carte Google n'est chargée
  qu'à l'approche de la section.
- Données structurées `MedicalClinic` (schema.org) et balises Open Graph.

## Points à valider avec la clinique avant la mise en ligne

Ces éléments ont été rédigés à partir du cahier des charges et doivent être confirmés :

1. **Nom de domaine** : l'e-mail fourni est `@cibe-clinique.com`, le cahier des charges
   indique `cibeclinique.com`. Mettre à jour `url` et `email` dans `site.json`.
2. **Slogan** : le site utilise « Tous pour la santé. Tout proche de vous ! »
   (cahier de demande) ; le logo porte « Tous pour notre santé ».
3. **Urgences « jour et nuit »** : déduit de l'organisation en gardes de jour et de nuit.
4. **Second numéro** `+236 74 35 58 29`, repris du cahier des charges.
5. **Jours de consultation des spécialistes** et horaires d'ouverture (non affichés).
6. **Moyens de paiement** (mobile money ?) et conventions avec employeurs ou assurances.
7. **Lecture du symbole** proposée sur la page « La clinique ».
8. **Photos** : ce sont des photos d'illustration. Les remplacer dès que possible par
   des photos de l'équipe et des locaux réels.
# cibe-clinique-web
