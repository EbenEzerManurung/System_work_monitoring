package utils

import "github.com/gin-gonic/gin"

// Success — response sukses generik
func Success(c *gin.Context, status int, data interface{}) {
	c.JSON(status, gin.H{"success": true, "data": data})
}

// Fail — response gagal generik
func Fail(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"success": false, "message": message})
}

// OK — shortcut untuk success dengan HTTP 200 + data
func OK(c *gin.Context, data interface{}) {
	c.JSON(200, gin.H{"success": true, "data": data})
}

// OKMsg — shortcut untuk success dengan HTTP 200 + message saja
func OKMsg(c *gin.Context, message string) {
	c.JSON(200, gin.H{"success": true, "message": message})
}
