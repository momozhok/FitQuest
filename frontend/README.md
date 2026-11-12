# FitQuest — frontend

Une page d’accueil et un espace personnel en français, avec thème sombre par défaut et mode clair mémorisé. Direction visuelle : charbon, ivoire et vert sauge, typographies Manrope et DM Sans, compagnon original Sprig.

## Utilisation

Ouvrir `apercu.html` directement dans un navigateur pour essayer la version autonome. La créature est incluse dans ce fichier. Les polices Google Fonts et la photographie Unsplash utilisent Internet ; des polices système prennent le relais hors ligne.

Pour le projet Vite / Svelte existant : `npm install`, puis `npm run dev` ou `npm run build`. Le Dockerfile et le backend ne sont pas modifiés. `public/images/sprig.webp` est servi à `/images/sprig.webp` par Vite et copié dans le build.

## Interactions

- Navigation entre accueil et espace personnel, puis activités, compagnon et objectifs.
- Ajout d’une activité avec durée et date obligatoires, distance facultative.
- Statistiques, graphique 7/14 jours, progression et XP mis à jour à partir des activités locales.
- Modification du prénom et de l’objectif hebdomadaire.
- Préférence de thème, activités et profil sauvegardés dans localStorage (`fq.theme`, `fq.activities`, `fq.profile`).
- Données initiales fictives, explicitement présentées comme un espace de démonstration.
- Mise en page adaptative, navigation mobile, focus clavier et respect des mouvements réduits.

Cette version ne réalise aucune requête API et n’offre pas d’authentification. Les données ne sont pas partagées entre appareils. Sprig est une illustration fixe.

## Validation

Syntaxe JavaScript vérifiée avec `node --check src/experience.js`. Accueil et tableau de bord vérifiés visuellement dans Thorium. La compilation Vite n’a pas pu être exécutée : téléchargement des dépendances bloqué par le réseau de la session. Les formulaires, les deux thèmes et les formats mobiles nécessitent une dernière vérification dans un navigateur avant publication.

## Visuels

Sprig : illustration originale créée avec le générateur d’images intégré. Brief : petite créature forestière vert mousse, oreilles en feuilles, visage et ventre crème, matière feutre/argile, assise sur un rocher, lumière douce, ambiance de forêt sombre, sans texte ni logo.

Paysage : https://images.unsplash.com/photo-1472396961693-142e6e269027 (Unsplash). Polices : Google Fonts, DM Sans et Manrope.
