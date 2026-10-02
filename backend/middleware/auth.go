package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"backend/utils"
)

func AuthRequired(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false, "message": "token tidak ditemukan",
			})
			return
		}
		tokenStr := strings.TrimPrefix(header, "Bearer ")
		claims := &utils.JWTClaims{}

		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"success": false, "message": "token tidak valid",
			})
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("email", claims.Email)
		c.Set("role", claims.Role)
		c.Set("department_id", claims.DepartmentID)
		c.Next()
	}
}

func RequireRole(allowed ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := c.GetString("role")
		for _, r := range allowed {
			if r == role {
				c.Next()
				return
			}
		}
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"success": false, "message": "akses ditolak: role tidak memiliki izin",
		})
	}
}

func CurrentUserID(c *gin.Context) uint64 {
	if v, ok := c.Get("user_id"); ok {
		if id, ok := v.(uint64); ok {
			return id
		}
	}
	return 0
}

func CurrentRole(c *gin.Context) string {
	return c.GetString("role")
}

func CurrentDepartmentID(c *gin.Context) uint64 {
	if v, ok := c.Get("department_id"); ok {
		if id, ok := v.(uint64); ok {
			return id
		}
	}
	return 0
}
