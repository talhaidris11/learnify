# Learnify Deployment Guide

## Common Issues and Solutions

### 1. MongoDB Connection Issues

**Problem**: App can't connect to MongoDB on live server
**Solution**: 
- Set up a MongoDB Atlas cluster (free tier available)
- Update your `MONGODB_URI` environment variable:
  ```
  MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/learnify
  ```

### 2. CORS Issues

**Problem**: Frontend can't communicate with backend
**Solution**:
- Update the `FRONTEND_URL` environment variable with your actual frontend domain
- Or modify the CORS configuration in `server.js` to include your domain

### 3. Environment Variables

**Required for live deployment**:
```bash
NODE_ENV=production
JWT_SECRET=your-secure-random-string
MONGODB_URI=your-mongodb-connection-string
FRONTEND_URL=your-frontend-domain
```

### 4. Port Configuration

**Problem**: App not accessible on live server
**Solution**:
- Most hosting platforms (Render, Heroku, Railway) automatically set the `PORT` environment variable
- The app will use `process.env.PORT` or default to 3000

### 5. File Upload Issues

**Problem**: File uploads not working
**Solution**:
- Ensure the `uploads/` directory exists and has write permissions
- For cloud hosting, consider using cloud storage (AWS S3, Cloudinary) instead of local storage

## Platform-Specific Deployment

### Render.com
1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Build command: `npm install`
4. Start command: `npm start`

### Heroku
1. Install Heroku CLI
2. Create app: `heroku create your-app-name`
3. Set environment variables: `heroku config:set MONGODB_URI=your-uri`
4. Deploy: `git push heroku main`

### Railway
1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy automatically

## Testing Your Deployment

1. **Health Check**: Visit `https://your-domain.com/health`
2. **Database Connection**: Check server logs for MongoDB connection status
3. **CORS**: Open browser dev tools and check for CORS errors
4. **Authentication**: Test registration and login functionality

## Debugging Tips

1. Check server logs for error messages
2. Use browser dev tools to see network requests
3. Verify environment variables are set correctly
4. Test API endpoints directly with tools like Postman

## Common Error Messages

- `MongoDB connection failed`: Check your `MONGODB_URI`
- `Not allowed by CORS`: Update CORS configuration or `FRONTEND_URL`
- `JWT_SECRET not set`: Set the `JWT_SECRET` environment variable
- `Port already in use`: The hosting platform should handle this automatically 