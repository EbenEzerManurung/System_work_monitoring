package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type JWTClaims struct {
	UserID       uint64 `json:"user_id"`
	Email        string `json:"email"`
	Role         string `json:"role"`
	DepartmentID uint64 `json:"department_id"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint64, email, role string, departmentID uint64, secret string) (string, error) {
	claims := JWTClaims{
		UserID:       userID,
		Email:        email,
		Role:         role,
		DepartmentID: departmentID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
