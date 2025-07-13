# Learnify Deployment Guide

## Environment Variables Required

Set these environment variables on your live server:

```bash
# MongoDB Connection String (required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/learnify

# JWT Secret (required - use a secure random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Node Environment
NODE_ENV=production

# Port (optional, defaults to 3000)
PORT=3000
```

## Common Issues & Solutions

### 1. Registration Fails
- **Check MongoDB Connection**: Ensure `MONGODB_URI` is set correctly
- **Check JWT Secret**: Ensure `JWT_SECRET` is set
- **Check Logs**: Look for error messages in server logs

### 2. CORS Issues
- The server is configured to accept requests from:
  - Production: `https://learnify-y02m.onrender.com`
  - Development: `http://localhost:3000`, `http://127.0.0.1:3000`

### 3. Database Connection Issues
- Ensure MongoDB Atlas (or your MongoDB provider) allows connections from your server's IP
- Check if the MongoDB URI includes username, password, and database name

## Testing Registration

1. Check server health: `GET /health`
2. Check MongoDB connection status in the response
3. Try registration with valid data
4. Check server logs for detailed error messages

## Debug Steps

1. Check if MongoDB is connected by visiting `/health` endpoint
2. Look at server logs for registration attempts
3. Verify all required fields are being sent from frontend
4. Check if JWT_SECRET is properly set
5. Ensure CORS is configured for your domain 