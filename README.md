# Learnify

A learning management system for teachers and students.

## Live URLs
- Frontend: https://learnify11.netlify.app/
- Backend: https://learnify-y02m.onrender.com/

## Running Both Local and Live Simultaneously

You can run both environments at the same time! The app automatically detects which environment you're using.

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local server:**
   ```bash
   npm start
   ```

3. **Access local version:**
   - Open: `http://localhost:3000`
   - This will connect to your local backend at `http://localhost:3000`

### Live Production

- **Access live version:**
  - Open: `https://learnify11.netlify.app/`
  - This will connect to the live backend at `https://learnify-y02m.onrender.com`

### How It Works

The app automatically detects your environment:
- **Localhost/127.0.0.1** → Uses `http://localhost:3000` backend
- **Any other domain** → Uses `https://learnify-y02m.onrender.com` backend

### Environment Detection

The app automatically detects your environment:
- **Localhost/127.0.0.1** → Uses `http://localhost:3000` backend
- **Any other domain** → Uses `https://learnify-y02m.onrender.com` backend

### Environment Variables (Optional)
Create a `.env` file in the root directory:
```
MONGODB_URI=mongodb://localhost:27017/learnify
JWT_SECRET=your-secret-key
PORT=3000
```

## Features

- ✅ Automatic environment detection
- ✅ Works locally and live simultaneously
- ✅ No configuration changes needed
- ✅ Same codebase for both environments