# Career Compass - Data-Driven Career Guidance Platform

A modern, responsive web application designed to help high school and college students navigate career confusion through data-driven assessments and personalized recommendations.

## 🎯 Project Overview

Career Compass replaces traditional, sporadic career counselling with a continuous, AI-powered process that provides:
- **24/7 Accessibility**: Get guidance anytime, anywhere
- **AI Personalization**: Tailored recommendations based on aptitude, interests, and personality
- **Real-time Data**: Up-to-date salary trends and job market insights

## 🛠️ Technology Stack

- **HTML5**: Semantic markup for accessibility and SEO
- **CSS3**: Modern styling with Flexbox/Grid, CSS Variables, and animations
- **Vanilla JavaScript (ES6+)**: No frameworks - pure JavaScript for all interactions

## ✨ Features

### 1. **Authentication System (Landing Page)**
- Clean register/login interface
- Form validation (password matching, minimum length)
- Toggle between login and registration forms
- Session management using localStorage
- Logout functionality

### 2. **Hero Section**
- Engaging headline with gradient text effects
- Animated compass visualization using CSS animations
- Clear call-to-action button

### 2. **Features Grid**
- Three key value propositions displayed in card format
- Hover effects and smooth transitions
- Icon-based visual communication

### 3. **Assessment Suite**
Interactive assessment modules with progress tracking:

#### **Aptitude Test**
- Timed numerical/verbal reasoning questions
- Multiple choice format
- 5-minute countdown timer

#### **Interest Inventory (RIASEC Model)**
- Six career interest categories: Realistic, Investigative, Artistic, Social, Enterprising, Conventional
- Checkbox-based selection
- Color-coded categories

#### **Personality Profiler (Big Five Traits)**
- Five personality dimensions: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- Slider-based input with real-time value display
- Visual feedback for trait levels

### 4. **Career Explorer**
- Dynamic career cards generated based on assessment results
- Displays salary range, job growth, and required skills
- Click to view detailed career roadmaps

### 5. **Career Roadmap Modal**
- Step-by-step career path visualization
- Detailed descriptions for each milestone
- Smooth modal animations

### 6. **AI Counselor Chat**
- Interactive chat interface
- Simulated AI responses
- Message history with user/bot distinction

### 7. **Login/Profile Section**
- Clean login form with validation
- Responsive design
- Link to sign-up flow

## 🎨 Design System

### Color Palette
- **Primary**: Blue (#1976D2) - Trust and professionalism
- **Accent**: Orange (#FF9800) - Energy and action
- **Neutrals**: Grays for text and backgrounds

### Typography
- System fonts for optimal performance
- Responsive font sizes using CSS variables
- Clear hierarchy with multiple heading levels

### Spacing & Layout
- Consistent spacing system (0.5rem to 4rem)
- Maximum container width: 1200px
- Responsive breakpoints for mobile/tablet/desktop

## 📱 Responsive Design

The website is fully responsive with breakpoints at:
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

Mobile features:
- Hamburger navigation menu
- Stacked layouts for better readability
- Touch-friendly button sizes
- Optimized animations for performance

## 🚀 How to Use

### Opening the Website

1. **Local File System**:
   - Navigate to the project folder
   - Double-click `index.html` to open in your default browser

2. **Live Server** (Recommended):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   ```
   Then visit `http://localhost:8000`

### Navigation

- Use the top navigation menu to switch between sections
- Click "Start Your Free Assessment" to begin the assessment process
- Complete all three assessments to unlock career recommendations
- Click on career cards to view detailed roadmaps

## 📂 File Structure

```
career counselling application/
│
├── index.html          # Main HTML structure
├── style.css           # Complete styling and animations
├── script.js           # All JavaScript functionality
└── README.md           # This file
```

## 🎯 Key Interactions

### Assessment Flow
1. Click "Start Your Free Assessment" or navigate to Assessments
2. Complete Aptitude Test (timed, 5 minutes)
3. Submit and automatically move to Interest Inventory
4. Complete Interest Inventory (RIASEC model)
5. Submit and move to Personality Profiler
6. Complete Personality Profiler (Big Five traits)
7. View progress bar update to 100%
8. Automatically navigate to Career Explorer with generated matches

### Career Exploration
1. View three career cards with match percentages
2. Click any career card to open the roadmap modal
3. Review the step-by-step career path
4. Close modal and explore other careers

### Chat Interaction
1. Navigate to Counselor Chat section
2. Type a question in the input field
3. Press Enter or click the send button
4. Receive AI-generated responses

## 🎨 CSS Features

- **CSS Variables**: Centralized theming system
- **Flexbox & Grid**: Modern layout techniques
- **Animations**: Smooth transitions and keyframe animations
- **Box Shadows**: Material Design-inspired depth
- **Gradients**: Eye-catching color transitions
- **Custom Sliders**: Styled range inputs for personality assessment

## 💻 JavaScript Features

- **SPA Navigation**: Smooth section switching without page reloads
- **Progress Tracking**: Real-time assessment completion monitoring
- **Dynamic Content**: Career cards generated from data
- **Modal System**: Reusable modal for roadmap display
- **Timer Functionality**: Countdown timer for aptitude test
- **Form Handling**: Login form with validation
- **Chat Simulation**: Interactive messaging interface

## 🔧 Customization

### Adding New Careers
Edit the `careerData` array in `script.js`:

```javascript
{
    title: 'Your Career Title',
    match: '90% Match',
    salary: '$XX,XXX - $XXX,XXX',
    growth: 'High (XX% by 2030)',
    skills: ['Skill 1', 'Skill 2', 'Skill 3'],
    roadmap: [
        {
            step: 1,
            title: 'Step Title',
            description: 'Step description...'
        }
        // Add more steps...
    ]
}
```

### Changing Colors
Modify CSS variables in `style.css`:

```css
:root {
    --color-primary: #YourColor;
    --color-accent: #YourAccent;
}
```

### Adding Assessment Questions
Extend the HTML in the respective assessment panels and update the submission handlers in `script.js`.

## 🌟 Best Practices Implemented

1. **Semantic HTML**: Proper use of `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<footer>`
2. **Accessibility**: ARIA labels, keyboard navigation support
3. **SEO**: Meta tags, proper heading hierarchy, descriptive titles
4. **Performance**: Minimal dependencies, optimized animations, efficient selectors
5. **Maintainability**: Organized code structure, clear comments, modular functions
6. **Responsive**: Mobile-first approach with progressive enhancement

## 📊 Assessment Models

### RIASEC Model (Interest Inventory)
- **R**ealistic: Hands-on, practical work
- **I**nvestigative: Research and analysis
- **A**rtistic: Creative expression
- **S**ocial: Helping and teaching
- **E**nterprising: Leadership and persuasion
- **C**onventional: Organization and structure

### Big Five Personality Traits
- **Openness**: Imagination vs. practicality
- **Conscientiousness**: Organization vs. flexibility
- **Extraversion**: Outgoing vs. reserved
- **Agreeableness**: Cooperative vs. competitive
- **Neuroticism**: Sensitive vs. calm

## 🎓 Educational Value

This project demonstrates:
- Modern web development without frameworks
- Clean, maintainable code architecture
- User experience design principles
- Interactive web application development
- Responsive design implementation
- CSS animation techniques
- JavaScript DOM manipulation
- Event-driven programming

## 📝 Future Enhancements

Potential additions for production version:
- Backend API integration for real assessments
- User authentication and profile storage
- Database for career data and user progress
- Advanced AI chatbot with NLP
- Data visualization for assessment results
- Email notifications and reminders
- Social sharing features
- Admin dashboard for content management

## 📄 License

This is a prototype/educational project. Feel free to use and modify as needed.

## 👨‍💻 Development Notes

- No external libraries or frameworks required
- Works in all modern browsers (Chrome, Firefox, Safari, Edge)
- Tested for responsive behavior on multiple devices
- Code is commented for educational purposes
- Follows ES6+ JavaScript standards

---

**Built with ❤️ for students navigating their career journey**
