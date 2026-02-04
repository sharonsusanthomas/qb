# Academic Question Generator - Frontend

A minimal, modern web interface for the Academic Question Generator API.

## Features

- ✨ Clean, modern dark theme UI
- 📱 Fully responsive design
- 🎯 Real-time question generation
- 📋 Copy question with metadata
- ⚡ Smooth animations and transitions

## Setup

### Option 1: Simple HTTP Server (Python)

```bash
cd frontend
python -m http.server 8080
```

Then open: http://localhost:8080

### Option 2: Live Server (VS Code Extension)

1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

### Option 3: Any HTTP Server

```bash
# Using Node.js http-server
npx http-server frontend -p 8080

# Using PHP
php -S localhost:8080 -t frontend
```

## Usage

1. Make sure the backend API is running on `http://localhost:8000`
2. Open the frontend in your browser
3. Fill in the form:
   - Subject (e.g., "Data Structures")
   - Topic (e.g., "Arrays")
   - Bloom's Level (RBT1-RBT6)
   - Difficulty (Easy/Medium/Hard)
   - Marks (1-100)
4. Click "Generate Question"
5. View and copy the generated question

## Files

- `index.html` - Main HTML structure
- `styles.css` - Modern dark theme styling
- `script.js` - API integration and interactions

## Screenshot

The interface features:
- Gradient header with emoji
- Clean form with proper validation
- Animated loading states
- Beautiful question display with metadata badges
- Copy to clipboard functionality
- Error handling with user-friendly messages

## Notes

- Requires the backend API to be running
- CORS is already configured in the backend
- Works on all modern browsers
