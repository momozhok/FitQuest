# FitQuest

Structure initiale de l'application FitQuest :

- `/frontend` : application Svelte (Vite) avec Tailwind CSS.
- `/backend` : API REST Go avec SQLite.

## Lancer le frontend

```bash
cd /home/runner/work/FitQuest/FitQuest/frontend
npm install
npm run dev
```

## Lancer le backend

```bash
cd /home/runner/work/FitQuest/FitQuest/backend
go mod tidy
go run main.go
```

Le backend démarre sur `http://localhost:8080` avec :

- `POST /activities` pour enregistrer une activité sportive
- `GET /creature` pour récupérer l'état de la créature
