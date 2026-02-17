# How to View Career Compass Website

## Option 1: Double-Click (Simplest)
1. Navigate to: `e:\career counselling application\`
2. Double-click on `index.html`
3. The website will open in your default browser

## Option 2: Using a Local Server (Recommended for Best Experience)

### Using Python (if installed):
```bash
cd "e:\career counselling application"
python -m http.server 8000
```
Then open: http://localhost:8000

### Using Node.js (if installed):
```bash
cd "e:\career counselling application"
npx http-server
```
Then open the URL shown in the terminal

## What to Explore

### 1. Authentication (Landing Page)
- **First-time users**: Click "Create one now" to register
  - Enter your full name, email, and password (min 8 characters)
  - Confirm password and accept terms
  - Click "Create Account"
- **Returning users**: Enter email and password to login
- Toggle between login and register forms
- Session persists using localStorage

### 2. Hero Section (After Login)
- Animated compass visualization
- Click "Start Your Free Assessment" button

### 2. Navigation
- Use the top menu to navigate between sections
- On mobile, click the hamburger menu (three lines)

### 3. Assessments
- **Aptitude Test**: Timed 5-minute test with sample questions
- **Interest Inventory**: RIASEC model with 6 categories
- **Personality Profiler**: Big Five traits with interactive sliders
- Watch the progress bar update as you complete each test

### 4. Career Explorer
- After completing assessments, view matched careers
- Click any career card to see the detailed roadmap modal
- Review step-by-step career paths

### 5. AI Counselor Chat
- Type questions in the chat interface
- Receive simulated AI responses

### 6. Login Section
- Test the login form interface

## Interactive Features to Test

✅ **Authentication** (register/login/logout)
✅ Navigation between sections (SPA behavior)
✅ Assessment tab switching
✅ Progress bar updates
✅ Loading animations
✅ Career card generation
✅ Modal roadmap display
✅ Chat functionality
✅ Personality slider interactions
✅ Timer countdown (aptitude test)
✅ Responsive design (resize browser window)
✅ Mobile menu toggle
✅ Session persistence (refresh page to test)

## Browser Compatibility

Works best in modern browsers:
- Chrome/Edge (Recommended)
- Firefox
- Safari

## Troubleshooting

**If styles don't load:**
- Make sure all files are in the same directory
- Check that `style.css` and `script.js` are present

**If JavaScript doesn't work:**
- Open browser console (F12) to check for errors
- Ensure `script.js` is in the same folder

**For mobile testing:**
- Use browser DevTools (F12) → Toggle device toolbar
- Or resize browser window to < 768px width

Enjoy exploring Career Compass! 🧭
