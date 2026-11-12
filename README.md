# Le Frigo

Application complète pour cuisiner avec les ingrédients disponibles : frigo personnel, suggestions de recettes, favoris, courses et mode cuisson. Interface française adaptée aux mobiles, thème crème et rouge tomate, avec mode sombre.

Le projet succède à FitQuest dans ce dépôt. Les anciens dossiers `frontend/` et `backend/` sont conservés ; l’application active et le Compose utilisent désormais `le-frigo/`. La nouvelle base utilise un volume distinct et ne touche pas aux données FitQuest.

## Démarrage rapide

Node.js 24 LTS recommandé (minimum 22.13). Aucune dépendance externe à installer.

```sh
cd le-frigo
npm start
```

Ouvrir http://localhost:8080 et créer un compte. Les six ingrédients initiaux sont des exemples modifiables. La base SQLite est créée dans `le-frigo/data/frigo.sqlite`, ignorée par Git.

```sh
npm run check
npm test
```

## Docker / Coolify

Depuis la racine du dépôt, pour un essai local :

```sh
docker compose -f docker-compose.yml -f le-frigo/compose.local.yaml up --build -d
```

Ouvrir http://localhost:8088. `FRIGO_PORT` permet de changer ce port. Le Compose principal ne publie pas directement de ports : il est prévu pour le proxy Coolify.

Dans Coolify, sélectionner la branche contenant Le Frigo et `/docker-compose.yml`. Garder le domaine uniquement sur le service **frontend**, port **80**. L’API reste sur **backend:8080**, accessible via `/api/` par le frontend. Définir `SECURE_COOKIES=true` pour un domaine HTTPS, puis redéployer. Le frontend attend que l’API soit saine.

Le volume `lefrigo_sqlite` conserve les données lors des redéploiements. Ne pas utiliser `docker compose down -v` si elles doivent être conservées. Sauvegarder la base avec l’API SQLite backup ou arrêter le backend avant de copier l’ensemble du volume (incluant les fichiers WAL éventuels).

## Fonctionnalités

- Inscription, connexion et déconnexion ; sessions de sept jours dans un cookie HttpOnly, mots de passe dérivés avec scrypt et sel aléatoire.
- 27 ingrédients, quantités libres et dates facultatives. Les dates dépassées sont signalées et exclues des ingrédients disponibles pour les suggestions.
- 12 recettes intégrées : classement selon les ingrédients manquants, durée et filtre végétarien. Aucune API payante nécessaire.
- Bouton surprise privilégiant les recettes réalisables avec les ingrédients disponibles.
- Favoris personnels et courses avec ajout des ingrédients manquants, cases à cocher, suppression et copie.
- Fiches pour deux personnes, étapes guidées et minuteur tant que la page reste ouverte.
- Thèmes clair et sombre, navigation clavier et adaptations aux petits écrans.

## Architecture

- `le-frigo/server.mjs` : serveur HTTP Node.js et API JSON, SQLite native `node:sqlite`.
- `le-frigo/recipes.mjs` : catalogue d’ingrédients et recettes, classement déterministe.
- `le-frigo/public/` : frontend HTML/CSS/JavaScript sans compilation, images culinaires générées et hébergées localement.
- `le-frigo/test/api.test.mjs` : tests HTTP de l’authentification, validation, expiration, isolation des comptes, favoris, courses, persistance et fichiers statiques.
- `.github/workflows/le-frigo.yml` : vérifications Node 24, tests, validation Compose et construction des images Docker.

## API

Les écritures acceptent du JSON, même les DELETE/PUT sans champs (`{}`). Les routes personnelles requièrent le cookie de session. Les requêtes SQL sont paramétrées et les écritures d’une autre origine sont refusées.

| Méthode | Route | Usage |
|---|---|---|
| GET | `/api/health` | État du serveur |
| POST | `/api/auth/register` | `{name,email,password}` (10 à 128 caractères) |
| POST | `/api/auth/login` | `{email,password}` |
| GET | `/api/auth/me` | Compte connecté |
| POST | `/api/auth/logout` | Invalider la session courante |
| GET | `/api/ingredients` | Catalogue public |
| GET, POST | `/api/pantry` | Lire ou enregistrer `{ingredient_id,quantity,expires}` |
| DELETE | `/api/pantry/:id` | Retirer un ingrédient |
| GET | `/api/recipes?time=30&vegetarian=true&q=pâtes` | Recettes classées |
| GET | `/api/favorites` | Identifiants favoris |
| PUT, DELETE | `/api/favorites/:recipeId` | Garder ou retirer une recette |
| GET, POST | `/api/groceries` | Lire ou ajouter `{name}` / `{names:[]}` |
| PATCH, DELETE | `/api/groceries/:id` | Cocher `{checked:true}` ou supprimer |

## Périmètre

La correspondance vérifie la présence des ingrédients, pas les stocks en grammes. Les quantités doivent être vérifiées avant cuisson. L’huile, le sel et le poivre sont supposés disponibles. Le catalogue intégré au code peut être étendu ; il n’y a pas encore d’administration de recettes ni de réinitialisation de mot de passe par e-mail. Certaines recettes partagent une photo d’ambiance, indiqué dans les fiches. Visuels générés avec l’outil image intégré.

Le serveur utilise un processus Node.js avec SQLite. Le plafond de tentatives de connexion est par adresse réseau et en mémoire ; derrière le proxy, les visiteurs peuvent partager ce plafond. Pour un service à plus grande échelle, ajouter une limitation dédiée au niveau du proxy et une solution d’envoi d’e-mails.

## Variables

- `PORT` : serveur local, 8080 par défaut.
- `DB_PATH` : fichier SQLite, `/data/frigo.sqlite` dans Docker.
- `SECURE_COOKIES` : `true` sur HTTPS ; `false` pour localhost HTTP.
- `FRIGO_PORT` : port publié par la surcharge Compose locale, 8088 par défaut.

Aucun secret ni compte de test n’est livré dans Git. Les données locales ne sont pas incluses dans le dépôt.
