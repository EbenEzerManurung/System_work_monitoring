package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Recovery — custom panic handler (opsional, gin.Recovery() juga sudah cukup)
func Recovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("🔥 panic: %v", err)
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"success": false,
					"message": "Internal server error",
				})
			}
		}()
		c.Next()
	}
}

// NoRoute — handler 404 JSON
func NoRoute(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"message": "Endpoint tidak ditemukan: " + c.Request.URL.Path,
	})
}

// NoMethod — handler 405 JSON
func NoMethod(c *gin.Context) {
	c.JSON(http.StatusMethodNotAllowed, gin.H{
		"success": false,
		"message": "Method tidak diizinkan",
	})
}
