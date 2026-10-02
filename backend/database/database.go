package database

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/go-sql-driver/mysql"

	"backend/config"
)

// Connect — buat database jika belum ada, lalu konek ke database tersebut
func Connect(cfg *config.Config) (*sql.DB, error) {
	// 1. Konek tanpa DB untuk CREATE DATABASE
	tmp, err := sql.Open("mysql", cfg.DSNWithoutDB())
	if err != nil {
		return nil, fmt.Errorf("buka koneksi awal: %w", err)
	}
	defer tmp.Close()

	createStmt := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
		cfg.DBName,
	)
	if _, err := tmp.Exec(createStmt); err != nil {
		return nil, fmt.Errorf("create database: %w", err)
	}
	log.Printf("✅ Database `%s` siap", cfg.DBName)

	// 2. Konek ke database
	db, err := sql.Open("mysql", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("buka koneksi db: %w", err)
	}
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("ping db: %w", err)
	}

	log.Printf("✅ Terhubung ke MySQL: %s@%s:%s/%s",
		cfg.DBUser, cfg.DBHost, cfg.DBPort, cfg.DBName)

	return db, nil
}
