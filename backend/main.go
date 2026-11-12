package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type server struct {
	db *sql.DB
}

type activityPayload struct {
	UserID          int    `json:"user_id"`
	Sport           string `json:"sport"`
	DurationMinutes int    `json:"duration_minutes"`
	Calories        int    `json:"calories"`
}

type creatureState struct {
	UserID     int    `json:"user_id"`
	Name       string `json:"name"`
	Level      int    `json:"level"`
	Experience int    `json:"experience"`
	Energy     int    `json:"energy"`
	Mood       int    `json:"mood"`
}

func main() {
	db, err := sql.Open("sqlite3", "fitquest.db")
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := initSchema(db); err != nil {
		log.Fatalf("failed to initialize schema: %v", err)
	}

	s := &server{db: db}
	mux := http.NewServeMux()
	mux.HandleFunc("/activities", s.handleActivity)
	mux.HandleFunc("/creature", s.handleCreature)

	fmt.Println("FitQuest backend running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func initSchema(db *sql.DB) error {
	schema := `
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1,
    experience INTEGER NOT NULL DEFAULT 0,
    energy INTEGER NOT NULL DEFAULT 100,
    mood INTEGER NOT NULL DEFAULT 100,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sport TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    calories INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

INSERT OR IGNORE INTO users (id, username) VALUES (1, 'demo');
INSERT OR IGNORE INTO creatures (user_id, name) VALUES (1, 'Sprig');
`

	_, err := db.Exec(schema)
	return err
}

func (s *server) handleActivity(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload activityPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON payload", http.StatusBadRequest)
		return
	}

	if payload.UserID == 0 {
		payload.UserID = 1
	}
	if payload.Sport == "" || payload.DurationMinutes <= 0 || payload.Calories < 0 {
		http.Error(w, "sport, duration_minutes and calories are required", http.StatusBadRequest)
		return
	}

	_, err := s.db.Exec(
		`INSERT INTO activities (user_id, sport, duration_minutes, calories) VALUES (?, ?, ?, ?)`,
		payload.UserID,
		payload.Sport,
		payload.DurationMinutes,
		payload.Calories,
	)
	if err != nil {
		http.Error(w, "failed to store activity", http.StatusInternalServerError)
		return
	}

	experienceGain := payload.DurationMinutes + (payload.Calories / 20)
	energyLoss := payload.DurationMinutes / 5
	if energyLoss < 1 {
		energyLoss = 1
	}
	moodGain := payload.DurationMinutes / 10

	var level, experience, energy, mood int
	err = s.db.QueryRow(
		`SELECT level, experience, energy, mood FROM creatures WHERE user_id = ?`,
		payload.UserID,
	).Scan(&level, &experience, &energy, &mood)
	if err != nil {
		http.Error(w, "failed to load creature state", http.StatusInternalServerError)
		return
	}

	totalExperience := experience + experienceGain
	newLevel := level + (totalExperience / 100)
	newExperience := totalExperience % 100
	newEnergy := energy - energyLoss
	if newEnergy < 0 {
		newEnergy = 0
	}
	newMood := mood + moodGain
	if newMood > 100 {
		newMood = 100
	}

	_, err = s.db.Exec(
		`UPDATE creatures SET level = ?, experience = ?, energy = ?, mood = ?, updated_at = ? WHERE user_id = ?`,
		newLevel,
		newExperience,
		newEnergy,
		newMood,
		time.Now().UTC(),
		payload.UserID,
	)
	if err != nil {
		http.Error(w, "failed to update creature", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "activity recorded"})
}

func (s *server) handleCreature(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	userID := 1
	var creature creatureState
	err := s.db.QueryRow(`
SELECT user_id, name, level, experience, energy, mood
FROM creatures
WHERE user_id = ?`, userID).Scan(
		&creature.UserID,
		&creature.Name,
		&creature.Level,
		&creature.Experience,
		&creature.Energy,
		&creature.Mood,
	)
	if err == sql.ErrNoRows {
		http.Error(w, "creature not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "failed to load creature", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(creature)
}
