// ==================== API CONFIG ====================
const API_BASE = 'backend/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
    const defaults = {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' // Send session cookies
    };
    const config = { ...defaults, ...options };
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, config);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: 'Network error. Is the server running?' };
    }
}

// ==================== AUTHENTICATION SYSTEM ====================
const authSection = document.getElementById('auth');
const mainContent = document.getElementById('main-content');
const header = document.getElementById('header');
const loginContainer = document.getElementById('login-container');
const registerContainer = document.getElementById('register-container');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const loginForm = document.getElementById('login-form-main');
const registerForm = document.getElementById('register-form-main');
const logoutBtn = document.getElementById('logout-btn');

// Check if user is already logged in
function checkAuth() {
    const isAuthenticated = localStorage.getItem('careerCompassAuth');
    if (isAuthenticated === 'true') {
        showMainContent();
    } else {
        // Ensure auth page is visible when not logged in
        showAuthPage();
    }
}

// Show main content after authentication
function showMainContent() {
    authSection.classList.remove('active');
    authSection.style.display = 'none';
    mainContent.style.display = 'block';
    header.style.display = 'block';

    // Initialize navigation after showing main content
    initializeNavigation();
}

// Hide main content and show auth
function showAuthPage() {
    authSection.classList.add('active');
    authSection.style.display = 'flex';
    mainContent.style.display = 'none';
    header.style.display = 'none';
    localStorage.removeItem('careerCompassAuth');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
}

// Toggle between login and register forms
showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginContainer.classList.remove('active');
    registerContainer.classList.add('active');
});

showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerContainer.classList.remove('active');
    loginContainer.classList.add('active');
});

// Dynamic login fields based on role
const loginRoleSelect = document.getElementById('login-role');
const loginAdminCodeGroup = document.getElementById('login-admin-code-group');
const loginCounsellorIdGroup = document.getElementById('login-counsellor-id-group');

loginRoleSelect.addEventListener('change', () => {
    const role = loginRoleSelect.value;
    loginAdminCodeGroup.style.display = role === 'admin' ? 'block' : 'none';
    loginCounsellorIdGroup.style.display = role === 'counselor' ? 'block' : 'none';
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const role = document.getElementById('login-role').value;
    const adminCode = document.getElementById('login-admin-code').value;
    const counsellorId = document.getElementById('login-counsellor-id').value;

    if (!role) {
        alert('Please select your role (Admin, Counselor, or Student)');
        return;
    }

    if (role === 'admin' && !adminCode) {
        alert('Admin code is required for admin login');
        return;
    }

    if (role === 'counselor' && !counsellorId) {
        alert('Counsellor ID is required for counsellor login');
        return;
    }

    if (email && password) {
        showLoading();

        // Map 'counselor' to 'counsellor' for backend compatibility
        const apiRole = role === 'counselor' ? 'counsellor' : role;

        const payload = { email, password, role: apiRole };
        if (role === 'admin') payload.admin_code = adminCode;
        if (role === 'counselor') payload.counsellor_id = counsellorId;

        const result = await apiCall('auth.php?action=login', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        hideLoading();

        if (result.success) {
            // Store auth state locally for quick UI checks
            localStorage.setItem('careerCompassAuth', 'true');
            localStorage.setItem('userName', result.data.name);
            localStorage.setItem('userRole', apiRole);
            localStorage.setItem('userId', result.data.id);
            if (result.data.counsellor_id) {
                localStorage.setItem('counsellorId', result.data.counsellor_id);
            }

            const roleDisplay = apiRole.charAt(0).toUpperCase() + apiRole.slice(1);
            alert(`Welcome back! Logged in as ${roleDisplay}: ${result.data.name}`);

            showMainContent();
            loginForm.reset();
            loginAdminCodeGroup.style.display = 'none';
            loginCounsellorIdGroup.style.display = 'none';
        } else {
            alert(result.message || 'Login failed. Please check your credentials.');
        }
    }
});

// Handle Registration
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.getElementById('register-role').value;
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (!role) {
        alert('Please select your role (Admin, Counselor, or Student)');
        return;
    }

    if (password !== confirm) {
        alert('Passwords do not match!');
        return;
    }

    if (password.length < 8) {
        alert('Password must be at least 8 characters long!');
        return;
    }

    showLoading();

    const apiRole = role === 'counselor' ? 'counsellor' : role;

    const result = await apiCall('auth.php?action=register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role: apiRole })
    });

    hideLoading();

    if (result.success) {
        localStorage.setItem('careerCompassAuth', 'true');
        localStorage.setItem('userName', name);
        localStorage.setItem('userRole', role);
        localStorage.setItem('userId', result.data.id);

        const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
        alert(`Account created successfully! Welcome, ${name} (${roleDisplay})!`);

        showMainContent();
        registerForm.reset();
    } else {
        alert(result.message || 'Registration failed. Please try again.');
    }
});

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to logout?')) {
        await apiCall('auth.php?action=logout', { method: 'POST' });

        showAuthPage();
        localStorage.removeItem('userId');

        // Reset all progress
        completedTests = 0;
        updateProgress();

        // Clear career cards
        const careerGrid = document.getElementById('career-grid');
        careerGrid.innerHTML = '';

        alert('You have been logged out successfully.');
    }
});

// Check authentication on page load
checkAuth();

// ==================== NAVIGATION & SECTION MANAGEMENT ====================
const navLinks = document.querySelectorAll('.nav__link');
const sections = document.querySelectorAll('.section');
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');

// Initialize navigation - but ONLY if user is authenticated
function initializeNavigation() {
    const currentPath = window.location.hash.slice(1) || 'home';
    showSection(currentPath);
}

// Function to show a specific section
function showSection(sectionName) {
    // Update active states
    navLinks.forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Hide all sections EXCEPT auth section
    sections.forEach(section => {
        // Don't touch the auth section
        if (section.id !== 'auth') {
            section.classList.remove('active');
            section.style.display = 'none';
        }
    });

    // Show target section
    const targetSection = document.getElementById(sectionName);
    if (targetSection && targetSection.id !== 'auth') {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'auto' });

    // Close mobile menu
    if (navMenu) {
        navMenu.classList.remove('active');
    }
}

// Navigation click handler
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        // Get target section
        const targetSection = link.getAttribute('data-section');

        // Update URL hash (this will trigger hashchange event)
        window.location.hash = targetSection;
    });
});

// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
    const sectionName = window.location.hash.slice(1) || 'home';
    showSection(sectionName);
});

// Mobile menu toggle
navToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
});

// CTA button - navigate to assessments
document.getElementById('cta-assessment').addEventListener('click', () => {
    window.location.hash = 'assessments';
});

// ==================== ASSESSMENT TABS ====================
const tabBtns = document.querySelectorAll('.tab-btn');
const assessmentPanels = document.querySelectorAll('.assessment-panel');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');

        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show target panel
        assessmentPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.id === `${targetTab}-panel`) {
                panel.classList.add('active');
            }
        });
    });
});

// ==================== APTITUDE TEST QUESTIONS ====================
const aptitudeQuestions = [
    {
        question: "If a train travels 120 km in 2 hours, and then 180 km in 3 hours, what is its average speed for the entire journey?",
        options: ["50 km/h", "60 km/h", "65 km/h", "70 km/h"],
        correct: 1
    },
    {
        question: "A book costs $15 after a 25% discount. What was the original price?",
        options: ["$18", "$20", "$22", "$25"],
        correct: 1
    },
    {
        question: "If 5 workers can complete a task in 12 days, how many days will it take 3 workers to complete the same task?",
        options: ["15 days", "18 days", "20 days", "24 days"],
        correct: 2
    },
    {
        question: "What is the next number in the sequence: 2, 6, 12, 20, 30, ?",
        options: ["38", "40", "42", "44"],
        correct: 2
    },
    {
        question: "A rectangle has a length of 15 cm and width of 8 cm. What is its perimeter?",
        options: ["23 cm", "46 cm", "120 cm", "184 cm"],
        correct: 1
    },
    {
        question: "If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely Lazzies. This statement is:",
        options: ["True", "False", "Cannot be determined", "Sometimes true"],
        correct: 0
    },
    {
        question: "Complete the analogy: Book is to Reading as Fork is to:",
        options: ["Drawing", "Writing", "Eating", "Stirring"],
        correct: 2
    },
    {
        question: "A car travels at 60 km/h for 2 hours, then at 80 km/h for 3 hours. What is the total distance traveled?",
        options: ["280 km", "300 km", "320 km", "360 km"],
        correct: 3
    },
    {
        question: "If 3x + 7 = 22, what is the value of x?",
        options: ["3", "5", "7", "9"],
        correct: 1
    },
    {
        question: "What percentage is 45 out of 180?",
        options: ["20%", "25%", "30%", "35%"],
        correct: 1
    },
    {
        question: "Which word does NOT belong with the others?",
        options: ["Apple", "Banana", "Carrot", "Orange"],
        correct: 2
    },
    {
        question: "If today is Wednesday, what day will it be 100 days from now?",
        options: ["Monday", "Tuesday", "Wednesday", "Thursday"],
        correct: 3
    },
    {
        question: "A store sells apples at $2 each and oranges at $3 each. If you buy 5 apples and 4 oranges, how much do you spend?",
        options: ["$20", "$22", "$24", "$26"],
        correct: 1
    },
    {
        question: "What is 15% of 200?",
        options: ["25", "30", "35", "40"],
        correct: 1
    },
    {
        question: "If a cube has a side length of 4 cm, what is its volume?",
        options: ["16 cm³", "32 cm³", "48 cm³", "64 cm³"],
        correct: 3
    },
    {
        question: "Complete the pattern: A1, C3, E5, G7, ?",
        options: ["H8", "I9", "I8", "H9"],
        correct: 1
    },
    {
        question: "A clock shows 3:15. What is the angle between the hour and minute hands?",
        options: ["0°", "7.5°", "15°", "22.5°"],
        correct: 1
    },
    {
        question: "If 2^x = 32, what is the value of x?",
        options: ["3", "4", "5", "6"],
        correct: 2
    },
    {
        question: "Which number should come next in the series: 1, 4, 9, 16, 25, ?",
        options: ["30", "32", "36", "40"],
        correct: 2
    },
    {
        question: "A bag contains 3 red balls, 5 blue balls, and 2 green balls. What is the probability of randomly selecting a blue ball?",
        options: ["1/5", "1/3", "1/2", "2/5"],
        correct: 2
    }
];

let currentQuestionIndex = 0;
let userAnswers = new Array(aptitudeQuestions.length).fill(null);

// Render current question
function renderAptitudeQuestion() {
    const container = document.getElementById('aptitude-questions-container');
    const question = aptitudeQuestions[currentQuestionIndex];

    container.innerHTML = `
        <div class="question-card">
            <p class="question-number">Question ${currentQuestionIndex + 1} of ${aptitudeQuestions.length}</p>
            <h4 class="question-text">${question.question}</h4>
            <div class="options">
                ${question.options.map((option, index) => `
                    <label class="option">
                        <input type="radio" name="current-question" value="${index}" 
                            ${userAnswers[currentQuestionIndex] === index ? 'checked' : ''}>
                        <span class="option-text">${option}</span>
                    </label>
                `).join('')}
            </div>
        </div>
    `;

    // Update navigation buttons
    document.getElementById('prev-question').disabled = currentQuestionIndex === 0;
    document.getElementById('next-question').disabled = currentQuestionIndex === aptitudeQuestions.length - 1;
    document.getElementById('question-counter').textContent = `Question ${currentQuestionIndex + 1} of ${aptitudeQuestions.length}`;

    // Add event listeners to save answer
    const radioButtons = container.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        radio.addEventListener('change', (e) => {
            userAnswers[currentQuestionIndex] = parseInt(e.target.value);
        });
    });
}

// Navigation handlers
document.getElementById('prev-question').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderAptitudeQuestion();
    }
});

document.getElementById('next-question').addEventListener('click', () => {
    if (currentQuestionIndex < aptitudeQuestions.length - 1) {
        currentQuestionIndex++;
        renderAptitudeQuestion();
    }
});

// Initialize first question
renderAptitudeQuestion();

// ==================== ASSESSMENT SUBMISSIONS ====================
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const loadingOverlay = document.getElementById('loading-overlay');

let completedTests = 0;
const totalTests = 3;

// Submit Aptitude Test
document.getElementById('submit-aptitude').addEventListener('click', () => {
    showLoading();

    setTimeout(() => {
        hideLoading();
        completedTests++;
        updateProgress();

        // Move to next tab
        const interestTab = document.querySelector('[data-tab="interest"]');
        interestTab.click();

        showNotification('Aptitude test completed!');
    }, 2000);
});

// Submit Interest Inventory
document.getElementById('submit-interest').addEventListener('click', () => {
    showLoading();

    setTimeout(() => {
        hideLoading();
        completedTests++;
        updateProgress();

        // Move to next tab
        const personalityTab = document.querySelector('[data-tab="personality"]');
        personalityTab.click();

        showNotification('Interest inventory completed!');
    }, 2000);
});

// Submit Personality Profile
document.getElementById('submit-personality').addEventListener('click', () => {
    showLoading();

    setTimeout(() => {
        hideLoading();
        completedTests++;
        updateProgress();

        showNotification('All assessments completed! View your career matches.');

        // Generate career cards
        generateCareerCards();

        // Navigate to explorer after a delay
        setTimeout(() => {
            const explorerLink = document.querySelector('[data-section="explorer"]');
            explorerLink.click();
        }, 1500);
    }, 2000);
});

// Update progress bar
function updateProgress() {
    const percentage = (completedTests / totalTests) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${Math.round(percentage)}% Complete`;
}

// Show loading overlay
function showLoading() {
    loadingOverlay.classList.add('active');
}

// Hide loading overlay
function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// Simple notification (could be enhanced with a toast library)
function showNotification(message) {
    alert(message);
}

// ==================== PERSONALITY SLIDERS ====================
const sliders = document.querySelectorAll('.slider');

sliders.forEach(slider => {
    const valueDisplay = document.getElementById(`${slider.id}-value`);

    slider.addEventListener('input', (e) => {
        valueDisplay.textContent = e.target.value;
    });
});

// ==================== EXPANDED CAREER CATALOG ====================
const careerCatalog = [
    // Technology Careers
    {
        title: 'Software Engineer',
        category: 'technology',
        match: '92% Match',
        description: 'Design, develop, and maintain software applications and systems.',
        salary: '$95,000 - $150,000',
        growth: 'High (22% by 2030)',
        skills: ['Python', 'JavaScript', 'Problem Solving', 'Git'],
        roadmap: [
            { step: 1, title: 'Bachelor\'s Degree', description: 'Pursue a degree in Computer Science, Software Engineering, or related field. Focus on data structures, algorithms, and programming fundamentals.' },
            { step: 2, title: 'Build Portfolio', description: 'Create personal projects, contribute to open source, and build a GitHub portfolio showcasing your coding skills.' },
            { step: 3, title: 'Internships', description: 'Complete 1-2 internships at tech companies to gain real-world experience and industry connections.' },
            { step: 4, title: 'Technical Skills', description: 'Master frameworks, cloud platforms (AWS/Azure), and modern development practices like CI/CD and Agile.' },
            { step: 5, title: 'Entry-Level Position', description: 'Apply for junior developer roles. Prepare for technical interviews with LeetCode and system design practice.' }
        ]
    },
    {
        title: 'Data Scientist',
        category: 'technology',
        match: '88% Match',
        description: 'Analyze complex data sets to derive insights and build predictive models.',
        salary: '$85,000 - $140,000',
        growth: 'Very High (31% by 2030)',
        skills: ['Python', 'Statistics', 'Machine Learning', 'SQL'],
        roadmap: [
            { step: 1, title: 'Educational Foundation', description: 'Bachelor\'s in Statistics, Mathematics, Computer Science, or related field. Consider a Master\'s for advanced roles.' },
            { step: 2, title: 'Learn Core Tools', description: 'Master Python, R, SQL, and data visualization tools like Tableau or Power BI.' },
            { step: 3, title: 'Machine Learning', description: 'Study ML algorithms, deep learning frameworks (TensorFlow, PyTorch), and statistical modeling.' },
            { step: 4, title: 'Build Projects', description: 'Create data analysis projects, participate in Kaggle competitions, and build a portfolio of work.' },
            { step: 5, title: 'Industry Experience', description: 'Start as a data analyst or junior data scientist. Gain domain expertise in healthcare, finance, or tech.' }
        ]
    },
    {
        title: 'Cybersecurity Analyst',
        category: 'technology',
        match: '85% Match',
        description: 'Protect organizations from cyber threats and security breaches.',
        salary: '$80,000 - $130,000',
        growth: 'Very High (33% by 2030)',
        skills: ['Network Security', 'Ethical Hacking', 'Risk Assessment', 'Compliance'],
        roadmap: [
            { step: 1, title: 'Education', description: 'Bachelor\'s in Cybersecurity, IT, or Computer Science.' },
            { step: 2, title: 'Certifications', description: 'Obtain CompTIA Security+, CEH, or CISSP certifications.' },
            { step: 3, title: 'Hands-on Practice', description: 'Use platforms like HackTheBox and TryHackMe for practical experience.' },
            { step: 4, title: 'Entry Role', description: 'Start as IT support or junior security analyst.' },
            { step: 5, title: 'Specialization', description: 'Focus on areas like penetration testing, incident response, or security architecture.' }
        ]
    },
    {
        title: 'UX/UI Designer',
        category: 'creative',
        match: '90% Match',
        description: 'Create intuitive and visually appealing user interfaces and experiences.',
        salary: '$70,000 - $120,000',
        growth: 'High (13% by 2030)',
        skills: ['Figma', 'User Research', 'Prototyping', 'Visual Design'],
        roadmap: [
            { step: 1, title: 'Learn Fundamentals', description: 'Study design principles, color theory, typography, and user psychology.' },
            { step: 2, title: 'Master Tools', description: 'Become proficient in Figma, Adobe XD, Sketch, and prototyping tools.' },
            { step: 3, title: 'Build Portfolio', description: 'Create case studies showcasing your design process and problem-solving skills.' },
            { step: 4, title: 'User Research', description: 'Learn user research methods, usability testing, and data-driven design.' },
            { step: 5, title: 'Get Hired', description: 'Apply for junior UX/UI roles. Network with designers and attend design events.' }
        ]
    },
    // Healthcare Careers
    {
        title: 'Registered Nurse',
        category: 'healthcare',
        match: '87% Match',
        description: 'Provide patient care and support in hospitals, clinics, and healthcare facilities.',
        salary: '$65,000 - $95,000',
        growth: 'High (9% by 2030)',
        skills: ['Patient Care', 'Medical Knowledge', 'Communication', 'Critical Thinking'],
        roadmap: [
            { step: 1, title: 'Nursing Degree', description: 'Complete an Associate\'s (ADN) or Bachelor\'s (BSN) in Nursing program.' },
            { step: 2, title: 'NCLEX Exam', description: 'Pass the NCLEX-RN licensing examination.' },
            { step: 3, title: 'Clinical Experience', description: 'Gain experience through clinical rotations and internships.' },
            { step: 4, title: 'Specialization', description: 'Consider specializing in areas like pediatrics, ICU, or emergency care.' },
            { step: 5, title: 'Continuing Education', description: 'Pursue certifications and advanced degrees for career advancement.' }
        ]
    },
    {
        title: 'Physical Therapist',
        category: 'healthcare',
        match: '84% Match',
        description: 'Help patients recover from injuries and improve mobility through rehabilitation.',
        salary: '$75,000 - $105,000',
        growth: 'High (18% by 2030)',
        skills: ['Anatomy', 'Rehabilitation', 'Patient Assessment', 'Exercise Prescription'],
        roadmap: [
            { step: 1, title: 'Bachelor\'s Degree', description: 'Complete undergraduate studies in biology, kinesiology, or related field.' },
            { step: 2, title: 'DPT Program', description: 'Earn a Doctor of Physical Therapy (DPT) degree (3 years).' },
            { step: 3, title: 'Clinical Rotations', description: 'Complete required clinical hours in various settings.' },
            { step: 4, title: 'Licensing', description: 'Pass the National Physical Therapy Examination (NPTE).' },
            { step: 5, title: 'Specialization', description: 'Consider board certification in sports, orthopedics, or neurology.' }
        ]
    },
    // Business Careers
    {
        title: 'Digital Marketing Manager',
        category: 'business',
        match: '85% Match',
        description: 'Develop and execute digital marketing strategies to grow brand presence.',
        salary: '$60,000 - $110,000',
        growth: 'High (10% by 2030)',
        skills: ['SEO', 'Content Strategy', 'Analytics', 'Social Media'],
        roadmap: [
            { step: 1, title: 'Degree or Certification', description: 'Bachelor\'s in Marketing, Communications, or Business. Consider Google Analytics and HubSpot certifications.' },
            { step: 2, title: 'Digital Skills', description: 'Learn SEO, SEM, social media marketing, email marketing, and content management systems.' },
            { step: 3, title: 'Analytics Proficiency', description: 'Master Google Analytics, Facebook Ads Manager, and data-driven decision making.' },
            { step: 4, title: 'Entry-Level Role', description: 'Start as a marketing coordinator or specialist. Build campaigns and track performance metrics.' },
            { step: 5, title: 'Management Position', description: 'Progress to manager role after 3-5 years. Lead teams, manage budgets, and develop strategies.' }
        ]
    },
    {
        title: 'Financial Analyst',
        category: 'business',
        match: '82% Match',
        description: 'Analyze financial data to guide business investment decisions.',
        salary: '$70,000 - $115,000',
        growth: 'Moderate (6% by 2030)',
        skills: ['Financial Modeling', 'Excel', 'Data Analysis', 'Forecasting'],
        roadmap: [
            { step: 1, title: 'Bachelor\'s Degree', description: 'Degree in Finance, Accounting, Economics, or Business Administration.' },
            { step: 2, title: 'Technical Skills', description: 'Master Excel, financial modeling, and analysis tools like Bloomberg Terminal.' },
            { step: 3, title: 'Certifications', description: 'Consider CFA (Chartered Financial Analyst) or CPA credentials.' },
            { step: 4, title: 'Internships', description: 'Gain experience through internships at banks, investment firms, or corporations.' },
            { step: 5, title: 'Career Growth', description: 'Progress to senior analyst, then portfolio manager or finance director roles.' }
        ]
    },
    {
        title: 'Product Manager',
        category: 'business',
        match: '89% Match',
        description: 'Lead product development from conception to launch and beyond.',
        salary: '$90,000 - $150,000',
        growth: 'High (11% by 2030)',
        skills: ['Product Strategy', 'Agile', 'User Research', 'Stakeholder Management'],
        roadmap: [
            { step: 1, title: 'Foundation', description: 'Bachelor\'s in Business, Engineering, or related field. MBA is advantageous.' },
            { step: 2, title: 'Technical Understanding', description: 'Learn basics of software development, UX design, and data analytics.' },
            { step: 3, title: 'Entry Role', description: 'Start as associate product manager or in related roles like business analyst.' },
            { step: 4, title: 'Product Skills', description: 'Master roadmapping, prioritization frameworks, and agile methodologies.' },
            { step: 5, title: 'Leadership', description: 'Grow into senior PM roles, leading larger products and teams.' }
        ]
    },
    // Creative Careers
    {
        title: 'Graphic Designer',
        category: 'creative',
        match: '86% Match',
        description: 'Create visual content for brands, marketing, and digital media.',
        salary: '$45,000 - $75,000',
        growth: 'Moderate (3% by 2030)',
        skills: ['Adobe Creative Suite', 'Typography', 'Branding', 'Layout Design'],
        roadmap: [
            { step: 1, title: 'Education', description: 'Bachelor\'s in Graphic Design, Visual Arts, or self-taught through online courses.' },
            { step: 2, title: 'Software Mastery', description: 'Become expert in Photoshop, Illustrator, InDesign, and Figma.' },
            { step: 3, title: 'Portfolio Development', description: 'Build a strong portfolio showcasing diverse design projects.' },
            { step: 4, title: 'Freelance/Agency', description: 'Gain experience through freelance work or agency positions.' },
            { step: 5, title: 'Specialization', description: 'Focus on areas like branding, web design, or motion graphics.' }
        ]
    },
    {
        title: 'Content Writer',
        category: 'creative',
        match: '83% Match',
        description: 'Create engaging written content for websites, blogs, and marketing materials.',
        salary: '$40,000 - $70,000',
        growth: 'Moderate (4% by 2030)',
        skills: ['Writing', 'SEO', 'Research', 'Editing'],
        roadmap: [
            { step: 1, title: 'Writing Skills', description: 'Develop strong writing skills through practice and formal education.' },
            { step: 2, title: 'Niche Selection', description: 'Choose specialization: technical, marketing, creative, or journalism.' },
            { step: 3, title: 'Portfolio Building', description: 'Create blog, guest post, and build portfolio of published work.' },
            { step: 4, title: 'SEO Knowledge', description: 'Learn SEO best practices and content optimization techniques.' },
            { step: 5, title: 'Career Growth', description: 'Progress to senior writer, editor, or content strategist roles.' }
        ]
    },
    // Education Careers
    {
        title: 'High School Teacher',
        category: 'education',
        match: '81% Match',
        description: 'Educate and mentor students in specific subject areas.',
        salary: '$50,000 - $75,000',
        growth: 'Moderate (4% by 2030)',
        skills: ['Subject Expertise', 'Classroom Management', 'Curriculum Development', 'Communication'],
        roadmap: [
            { step: 1, title: 'Bachelor\'s Degree', description: 'Degree in education or subject area with teaching certification program.' },
            { step: 2, title: 'Student Teaching', description: 'Complete required student teaching hours under supervision.' },
            { step: 3, title: 'Certification', description: 'Obtain state teaching license and pass required exams (Praxis, etc.).' },
            { step: 4, title: 'First Position', description: 'Apply for teaching positions and complete probationary period.' },
            { step: 5, title: 'Professional Development', description: 'Pursue master\'s degree and additional certifications for advancement.' }
        ]
    },
    {
        title: 'Instructional Designer',
        category: 'education',
        match: '84% Match',
        description: 'Design and develop educational programs and e-learning content.',
        salary: '$60,000 - $95,000',
        growth: 'High (7% by 2030)',
        skills: ['Learning Theory', 'E-Learning Tools', 'Curriculum Design', 'Assessment'],
        roadmap: [
            { step: 1, title: 'Education', description: 'Bachelor\'s in Education, Instructional Design, or related field.' },
            { step: 2, title: 'Learn Tools', description: 'Master Articulate Storyline, Adobe Captivate, and LMS platforms.' },
            { step: 3, title: 'Portfolio', description: 'Create sample courses and instructional materials for portfolio.' },
            { step: 4, title: 'Entry Role', description: 'Start as junior instructional designer or training specialist.' },
            { step: 5, title: 'Specialization', description: 'Focus on corporate training, higher ed, or K-12 e-learning.' }
        ]
    },
    // Engineering Careers
    {
        title: 'Mechanical Engineer',
        category: 'technology',
        match: '80% Match',
        description: 'Design, develop, and test mechanical devices and systems.',
        salary: '$75,000 - $110,000',
        growth: 'Moderate (7% by 2030)',
        skills: ['CAD', 'Thermodynamics', 'Materials Science', 'Problem Solving'],
        roadmap: [
            { step: 1, title: 'Bachelor\'s Degree', description: 'ABET-accredited degree in Mechanical Engineering.' },
            { step: 2, title: 'Technical Skills', description: 'Master CAD software (SolidWorks, AutoCAD) and simulation tools.' },
            { step: 3, title: 'Internships', description: 'Gain practical experience through co-ops or internships.' },
            { step: 4, title: 'FE Exam', description: 'Pass Fundamentals of Engineering exam for EIT certification.' },
            { step: 5, title: 'PE License', description: 'After 4 years experience, pursue Professional Engineer license.' }
        ]
    },
    {
        title: 'Civil Engineer',
        category: 'technology',
        match: '78% Match',
        description: 'Plan, design, and oversee construction of infrastructure projects.',
        salary: '$70,000 - $105,000',
        growth: 'Moderate (8% by 2030)',
        skills: ['Structural Analysis', 'Project Management', 'AutoCAD', 'Surveying'],
        roadmap: [
            { step: 1, title: 'Engineering Degree', description: 'Bachelor\'s in Civil Engineering from ABET-accredited program.' },
            { step: 2, title: 'Software Proficiency', description: 'Learn AutoCAD, Civil 3D, and structural analysis software.' },
            { step: 3, title: 'Field Experience', description: 'Work on construction sites and design projects during internships.' },
            { step: 4, title: 'FE Certification', description: 'Pass FE exam to become Engineer in Training (EIT).' },
            { step: 5, title: 'Professional Growth', description: 'Obtain PE license and specialize in structural, transportation, or environmental engineering.' }
        ]
    }
];

// ==================== CAREER CATALOG SYSTEM ====================
const careerCatalogEl = document.getElementById('career-catalog');
const careerSearch = document.getElementById('career-search');
const filterBtns = document.querySelectorAll('.filter-btn');

let currentFilter = 'all';
let searchQuery = '';

// Generate career catalog
function generateCareerCatalog(careers = careerCatalog) {
    careerCatalogEl.innerHTML = '';

    careers.forEach((career, index) => {
        const card = document.createElement('article');
        card.className = 'career-card';
        card.setAttribute('data-career-index', index);
        card.setAttribute('data-category', career.category);

        card.innerHTML = `
            <div class="career-card__header">
                <h3 class="career-card__title">${career.title}</h3>
                <span class="career-card__category">${career.category}</span>
            </div>
            <div class="career-card__body">
                <p class="career-card__description">${career.description}</p>
                <div class="career-card__stat">
                    <span class="stat-label">Salary Range</span>
                    <span class="stat-value">${career.salary}</span>
                </div>
                <div class="career-card__stat">
                    <span class="stat-label">Job Growth</span>
                    <span class="stat-value">${career.growth}</span>
                </div>
                <div class="career-card__tags">
                    ${career.skills.map(skill => `<span class="tag">${skill}</span>`).join('')}
                </div>
            </div>
        `;

        // Add click handler to show roadmap
        card.addEventListener('click', () => {
            showRoadmap(career);
        });

        careerCatalogEl.appendChild(card);
    });

    if (careers.length === 0) {
        careerCatalogEl.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 2rem; color: var(--color-text-secondary);">No careers found matching your criteria.</p>';
    }
}

// Filter careers by category
function filterCareers() {
    let filtered = careerCatalog;

    // Apply category filter
    if (currentFilter !== 'all') {
        filtered = filtered.filter(career => career.category === currentFilter);
    }

    // Apply search filter
    if (searchQuery) {
        filtered = filtered.filter(career =>
            career.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            career.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            career.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }

    generateCareerCatalog(filtered);
}

// Filter button handlers
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        filterCareers();
    });
});

// Search handler
careerSearch.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    filterCareers();
});

// Initialize catalog with all careers
generateCareerCatalog();

// ==================== COUNSELOR SELECTION SYSTEM ====================
const counselorSelection = document.getElementById('counselor-selection');
const chatInterface = document.getElementById('chat-interface');
const counselorCards = document.querySelectorAll('.counselor-card');
const changeCounselorBtn = document.getElementById('change-counselor');
const chatCounselorName = document.getElementById('chat-counselor-name');
const chatCounselorSpecialty = document.getElementById('chat-counselor-specialty');
const chatCounselorAvatar = document.getElementById('chat-counselor-avatar');

const counselorData = {
    sarah: {
        name: 'Dr. Sarah Johnson',
        specialty: 'Technology & Engineering',
        avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%234A90E2'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-family='Arial'%3ES%3C/text%3E%3C/svg%3E",
        responses: [
            "Great question! In tech careers, continuous learning is essential. What specific area interests you?",
            "Software engineering offers excellent growth opportunities. Have you considered specializing in a particular domain?",
            "The tech industry values practical experience. Building projects is key to landing your first role.",
            "Certifications can boost your profile, but hands-on experience is what employers really value.",
            "Networking is crucial in tech. Attend meetups, contribute to open source, and engage with the community."
        ]
    },
    michael: {
        name: 'Michael Chen',
        specialty: 'Business & Finance',
        avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%2326A69A'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-family='Arial'%3EM%3C/text%3E%3C/svg%3E",
        responses: [
            "Business careers require strong analytical and communication skills. How can I help you develop these?",
            "The finance sector is evolving rapidly. Understanding fintech and data analytics is increasingly important.",
            "MBA programs can accelerate your career, but work experience is equally valuable.",
            "Networking and building relationships are crucial in business. Start building your professional network early.",
            "Consider internships in different business functions to find your passion before specializing."
        ]
    },
    emily: {
        name: 'Emily Rodriguez',
        specialty: 'Healthcare & Medicine',
        avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23EC407A'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-family='Arial'%3EE%3C/text%3E%3C/svg%3E",
        responses: [
            "Healthcare careers are incredibly rewarding. What aspect of patient care interests you most?",
            "The medical field requires dedication and compassion. Are you prepared for the rigorous training?",
            "Consider shadowing professionals in different healthcare roles to find your best fit.",
            "Healthcare is evolving with technology. Telemedicine and health informatics are growing fields.",
            "Work-life balance can be challenging in healthcare. It's important to find a specialty that aligns with your lifestyle goals."
        ]
    },
    david: {
        name: 'David Williams',
        specialty: 'Creative Arts & Design',
        avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23FF9800'/%3E%3Ctext x='50' y='50' text-anchor='middle' dy='.3em' fill='white' font-size='40' font-family='Arial'%3ED%3C/text%3E%3C/svg%3E",
        responses: [
            "Creative careers require a strong portfolio. What projects are you working on?",
            "The creative industry values unique perspectives. How do you differentiate your work?",
            "Freelancing offers flexibility, but building a stable client base takes time and effort.",
            "Stay current with design trends and tools. The creative field evolves rapidly.",
            "Collaboration is key in creative work. Build relationships with other creatives and potential clients."
        ]
    }
};

let currentCounselor = null;

// Handle counselor selection
counselorCards.forEach(card => {
    const startChatBtn = card.querySelector('.btn');
    const counselorId = card.getAttribute('data-counselor');

    startChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectCounselor(counselorId);
    });
});

function selectCounselor(counselorId) {
    currentCounselor = counselorId;
    const counselor = counselorData[counselorId];

    // Update chat header
    chatCounselorName.textContent = counselor.name;
    chatCounselorSpecialty.textContent = counselor.specialty;
    chatCounselorAvatar.innerHTML = `<img src="${counselor.avatar}" alt="${counselor.name}">`;

    // Hide selection, show chat
    counselorSelection.style.display = 'none';
    chatInterface.style.display = 'block';

    // Clear previous messages
    chatMessages.innerHTML = '';

    // Add welcome message
    addMessage(`Hello! I'm ${counselor.name}, specializing in ${counselor.specialty}. How can I help you today?`, false);
}

// Change counselor
changeCounselorBtn.addEventListener('click', () => {
    counselorSelection.style.display = 'block';
    chatInterface.style.display = 'none';
    currentCounselor = null;
});

// ==================== ROADMAP MODAL ====================
const roadmapModal = document.getElementById('roadmap-modal');
const closeModal = document.getElementById('close-modal');
const roadmapContent = document.getElementById('roadmap-content');

function showRoadmap(career) {
    roadmapContent.innerHTML = `
        <h2 class="roadmap__title">Career Roadmap: ${career.title}</h2>
        <div class="roadmap__steps">
            ${career.roadmap.map(step => `
                <div class="roadmap-step">
                    <div class="roadmap-step__number">${step.step}</div>
                    <h3 class="roadmap-step__title">${step.title}</h3>
                    <p class="roadmap-step__description">${step.description}</p>
                </div>
            `).join('')}
        </div>
    `;

    roadmapModal.classList.add('active');
}

closeModal.addEventListener('click', () => {
    roadmapModal.classList.remove('active');
});

// Close modal when clicking overlay
roadmapModal.querySelector('.modal__overlay').addEventListener('click', () => {
    roadmapModal.classList.remove('active');
});

// ==================== CHAT FUNCTIONALITY ====================
const chatInput = document.getElementById('chat-input');
const sendMessage = document.getElementById('send-message');
const chatMessages = document.getElementById('chat-messages');

function addMessage(text, isUser = false) {
    const message = document.createElement('div');
    message.className = `message ${isUser ? 'message--user' : 'message--bot'}`;

    message.innerHTML = `
        <div class="message__avatar">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                ${isUser
            ? '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6C10.3431 6 9 7.34315 9 9C9 10.6569 10.3431 12 12 12Z" stroke="currentColor" stroke-width="2"/><path d="M6 20C6 17.7909 8.68629 16 12 16C15.3137 16 18 17.7909 18 20" stroke="currentColor" stroke-width="2"/>'
            : '<path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2"/>'
        }
            </svg>
        </div>
        <div class="message__content">
            <p>${text}</p>
        </div>
    `;

    chatMessages.appendChild(message);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChatMessage() {
    const message = chatInput.value.trim();

    if (message) {
        // Add user message
        addMessage(message, true);
        chatInput.value = '';

        // Simulate bot response after delay
        setTimeout(() => {
            let response;

            // Use counselor-specific intelligent responses
            if (currentCounselor && counselorData[currentCounselor]) {
                response = generateIntelligentResponse(message, currentCounselor);
            } else {
                // Fallback to generic responses
                response = generateIntelligentResponse(message, 'generic');
            }

            addMessage(response, false);
        }, 1000);
    }
}

// Generate intelligent response based on user question
function generateIntelligentResponse(userMessage, counselorId) {
    const messageLower = userMessage.toLowerCase();

    // Define keyword-based response patterns
    const responsePatterns = {
        // Career-related keywords
        salary: {
            sarah: "In the tech industry, salaries vary widely based on experience and location. Entry-level software engineers typically start at $70-90k, while senior roles can exceed $150k. Focus on building strong skills and a portfolio to maximize your earning potential.",
            michael: "Business and finance salaries depend heavily on your specific role and industry. Entry-level analysts might start at $60-70k, while experienced professionals in finance can earn $100k+. Consider certifications like CFA to boost your earning potential.",
            emily: "Healthcare salaries are competitive and stable. Registered nurses typically earn $65-95k, while specialized roles and advanced practice nurses can earn significantly more. The field offers excellent job security and benefits.",
            david: "Creative field salaries can be variable. Entry-level designers might start at $40-50k, but experienced professionals with strong portfolios can earn $70-100k+. Many creatives supplement with freelance work for additional income.",
            generic: "Salaries vary significantly by industry, location, and experience level. Research specific roles on sites like Glassdoor or PayScale to get accurate salary ranges for your target positions."
        },
        education: {
            sarah: "For tech careers, a Computer Science degree is valuable but not always required. Many successful engineers are self-taught or have bootcamp backgrounds. Focus on building practical skills and a strong portfolio alongside formal education.",
            michael: "Business careers often benefit from a bachelor's degree in business, finance, or economics. An MBA can accelerate your career, but 2-3 years of work experience before pursuing an MBA is often recommended.",
            emily: "Healthcare careers typically require specific educational paths. Nursing requires an ADN or BSN, while becoming a doctor requires pre-med, medical school, and residency. Research the specific requirements for your target healthcare role.",
            david: "Creative careers value portfolios over degrees. While a design degree can be helpful, many successful creatives are self-taught. Focus on building a strong portfolio and mastering industry-standard tools.",
            generic: "Educational requirements vary by career. Research specific degree requirements for your target field, but remember that skills, experience, and continuous learning are equally important."
        },
        skill: {
            sarah: "Essential tech skills include programming languages (Python, JavaScript), version control (Git), problem-solving, and understanding of data structures and algorithms. Soft skills like communication and teamwork are equally important.",
            michael: "Key business skills include data analysis, financial modeling, strategic thinking, and communication. Proficiency in Excel, PowerPoint, and increasingly, data analytics tools like Tableau or Power BI, is highly valued.",
            emily: "Healthcare requires both technical skills (medical knowledge, patient care techniques) and soft skills (empathy, communication, stress management). Continuing education is essential as medical practices evolve.",
            david: "Creative professionals need mastery of design tools (Adobe Creative Suite, Figma), strong visual communication skills, creativity, and the ability to accept and incorporate feedback. Time management is also crucial.",
            generic: "Focus on developing both hard skills (technical abilities specific to your field) and soft skills (communication, teamwork, problem-solving). Continuous learning is key in any career."
        },
        start: {
            sarah: "Start by learning programming fundamentals through free resources like freeCodeCamp or Codecademy. Build small projects, contribute to open source, and create a GitHub portfolio. Apply for internships or junior developer positions.",
            michael: "Begin by gaining foundational business knowledge through courses or a degree. Seek internships in different business functions to find your passion. Network actively and consider joining professional organizations in your field of interest.",
            emily: "Research specific healthcare roles to find your best fit. Shadow professionals, volunteer at healthcare facilities, and ensure you meet prerequisite courses for your chosen path. Healthcare careers require dedication and planning.",
            david: "Start building your portfolio immediately. Take on small projects, even pro bono work, to gain experience. Learn industry-standard tools through online tutorials. Share your work on platforms like Behance or Dribbble.",
            generic: "Start by researching your target career thoroughly. Gain relevant skills through courses or self-study, seek internships or entry-level positions, and network with professionals in the field."
        },
        experience: {
            sarah: "Gain experience through internships, contributing to open-source projects, building personal projects, and participating in hackathons. Even small projects demonstrate your ability to apply your skills.",
            michael: "Seek internships, take on leadership roles in student organizations, and consider part-time work in business settings. Each experience, even if not directly related, builds transferable skills.",
            emily: "Volunteer at hospitals or clinics, shadow healthcare professionals, and complete required clinical rotations. Direct patient care experience is invaluable and often required for healthcare careers.",
            david: "Build experience by taking on freelance projects, volunteering your design skills for nonprofits, entering design competitions, and creating spec work for your portfolio. Every project is a learning opportunity.",
            generic: "Gain experience through internships, volunteer work, personal projects, and entry-level positions. Focus on building a portfolio of work that demonstrates your capabilities."
        },
        interview: {
            sarah: "Tech interviews often include coding challenges, system design questions, and behavioral questions. Practice on LeetCode, understand common algorithms, and be prepared to explain your thought process. Research the company's tech stack.",
            michael: "Business interviews focus on case studies, behavioral questions, and demonstrating analytical thinking. Practice the STAR method for behavioral questions and brush up on industry knowledge and current business trends.",
            emily: "Healthcare interviews assess both technical knowledge and interpersonal skills. Be prepared to discuss patient care scenarios, demonstrate empathy, and explain your motivation for entering healthcare. Research the facility's values.",
            david: "Creative interviews often involve portfolio reviews. Be prepared to walk through your design process, explain your decisions, and discuss how you handle feedback. Bring examples of your best work and be ready to discuss them in detail.",
            generic: "Prepare by researching the company, practicing common interview questions, preparing questions to ask, and having specific examples of your achievements ready. First impressions matter, so dress appropriately and arrive early."
        },
        certificate: {
            sarah: "Certifications like AWS, Google Cloud, or specific technology certifications can boost your resume, but practical experience is more valuable. Focus on building projects that demonstrate your skills.",
            michael: "Certifications like CFA, CPA, or PMP can significantly enhance your career prospects in business and finance. They demonstrate commitment and expertise, but combine them with practical experience.",
            emily: "Healthcare certifications are often required for specific roles. Research which certifications are necessary for your target position and maintain them through continuing education.",
            david: "While certifications exist in creative fields, a strong portfolio is far more important. Focus on mastering tools and building impressive work rather than collecting certificates.",
            generic: "Certifications can be valuable, especially in technical fields, but they should complement, not replace, practical experience and skills. Research which certifications are valued in your target industry."
        },
        remote: {
            sarah: "Tech is one of the most remote-friendly industries. Many companies offer fully remote or hybrid positions. Build strong communication skills and self-discipline for remote work success.",
            michael: "Remote work in business is increasingly common, especially in roles like digital marketing, consulting, and analysis. However, some business roles still require in-person presence for client meetings and collaboration.",
            emily: "Healthcare traditionally requires in-person work for patient care, but telemedicine is growing. Some healthcare roles like medical coding, health informatics, or telehealth counseling offer remote opportunities.",
            david: "Creative work is highly conducive to remote work. Many designers, writers, and content creators work remotely or freelance. Build a strong online presence and portfolio to attract remote opportunities.",
            generic: "Remote work opportunities are growing across industries. Develop strong self-management, communication, and digital collaboration skills to succeed in remote positions."
        },
        freelance: {
            sarah: "Tech freelancing is viable, especially for web development, mobile app development, or specialized skills. Build a strong portfolio, establish your rates, and use platforms like Upwork or Toptal to find clients.",
            michael: "Freelance consulting in business is common for experienced professionals. Build expertise in a specific area, develop a strong network, and consider starting part-time while maintaining stable employment.",
            emily: "Healthcare freelancing exists in areas like nursing (travel nursing), medical writing, or healthcare consulting. However, most clinical roles require traditional employment due to licensing and liability considerations.",
            david: "Freelancing is extremely common in creative fields. Build a diverse portfolio, set clear contracts and rates, and use platforms like Fiverr, 99designs, or direct client outreach. Expect income variability initially.",
            generic: "Freelancing offers flexibility but requires self-discipline, business skills, and financial planning. Start building a client base while employed, and ensure you have savings before going full-time freelance."
        }
    };

    // Check for keywords and generate appropriate response
    for (const [keyword, responses] of Object.entries(responsePatterns)) {
        if (messageLower.includes(keyword)) {
            return responses[counselorId] || responses.generic;
        }
    }

    // Additional pattern matching for common questions
    if (messageLower.includes('how') && (messageLower.includes('start') || messageLower.includes('begin'))) {
        return responsePatterns.start[counselorId] || responsePatterns.start.generic;
    }

    if (messageLower.includes('what') && messageLower.includes('need')) {
        return responsePatterns.skill[counselorId] || responsePatterns.skill.generic;
    }

    // Default responses if no keyword match
    const defaultResponses = counselorData[counselorId]?.responses || [
        "That's a great question! Could you provide more details about what specific aspect you'd like to explore?",
        "I'd be happy to help you with that. What's your current situation and what are your goals?",
        "That's an important consideration for your career path. What factors are most important to you?",
        "Let me help you think through that. What have you already considered or researched about this?",
        "Great question! To give you the most relevant advice, could you tell me more about your background and interests?"
    ];

    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

sendMessage.addEventListener('click', sendChatMessage);

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});


// ==================== APTITUDE TIMER ====================
let timerSeconds = 300; // 5 minutes
let timerInterval;

function startAptitudeTimer() {
    const timerDisplay = document.querySelector('#aptitude-timer span');

    timerInterval = setInterval(() => {
        timerSeconds--;

        const minutes = Math.floor(timerSeconds / 60);
        const seconds = timerSeconds % 60;

        timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        if (timerSeconds <= 0) {
            clearInterval(timerInterval);
            alert('Time\'s up! Submitting your test...');
            document.getElementById('submit-aptitude').click();
        }
    }, 1000);
}

// Start timer when aptitude panel is shown
document.querySelector('[data-tab="aptitude"]').addEventListener('click', () => {
    if (!timerInterval) {
        startAptitudeTimer();
    }
});

// ==================== SCROLL EFFECTS ====================
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');

    if (window.scrollY > 50) {
        header.style.boxShadow = 'var(--shadow-lg)';
    } else {
        header.style.boxShadow = 'var(--shadow-sm)';
    }
});

// ==================== CAREER API INTEGRATION ====================
let careerDataFromAPI = null;

async function loadCareersFromAPI() {
    const result = await apiCall('careers.php?action=list');
    if (result.success && result.data) {
        careerDataFromAPI = result.data;
        // Update careerCatalog with API data
        careerCatalog.length = 0; // Clear existing
        result.data.forEach(c => {
            careerCatalog.push({
                id: c.id,
                title: c.title,
                category: c.category,
                stream: c.stream,
                match: `${Math.floor(Math.random() * 20 + 80)}% Match`,
                description: c.description,
                salary: c.salary_range,
                growth: c.growth,
                skills: c.skills || [],
                roadmap: (c.roadmap || []).map((r, i) => ({
                    step: r.step || i + 1,
                    title: r.title,
                    description: r.desc || r.description
                }))
            });
        });
        generateCareerCatalog(careerCatalog);
        console.log(`Loaded ${careerCatalog.length} careers from database.`);
    } else {
        console.log('Using hardcoded career data (API not available).');
        generateCareerCatalog(careerCatalog);
    }
}

// ==================== PROFILE & REPORTS ====================
async function loadProfile() {
    const result = await apiCall('auth.php?action=profile');
    if (result.success && result.data) {
        const d = result.data;
        const avatarEl = document.getElementById('profile-avatar');
        const nameEl = document.getElementById('profile-name');
        const emailEl = document.getElementById('profile-email');
        const roleEl = document.getElementById('profile-role');
        const reportsEl = document.getElementById('stat-reports');

        if (avatarEl) avatarEl.textContent = (d.name || 'U')[0].toUpperCase();
        if (nameEl) nameEl.textContent = d.name || 'User';
        if (emailEl) emailEl.textContent = d.email || '';
        if (roleEl) roleEl.textContent = d.role || 'student';
        if (reportsEl) reportsEl.textContent = d.reports_count || 0;
    }
}

async function loadReports() {
    const result = await apiCall('reports.php?action=list');
    const grid = document.getElementById('reports-grid');
    const emptyState = document.getElementById('reports-empty');
    if (!grid) return;

    if (result.success && result.data && result.data.length > 0) {
        if (emptyState) emptyState.style.display = 'none';
        // Keep empty state hidden, render report cards
        let html = '';
        result.data.forEach(report => {
            const date = new Date(report.generated_at).toLocaleDateString('en-IN', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            html += `
                <div class="report-card" onclick="viewReport(${report.id})">
                    <div class="report-card__header">
                        <h4>${report.report_title || 'Career Recommendation Report'}</h4>
                        <div class="report-date">${date}</div>
                    </div>
                    <div class="report-card__body">
                        <div class="report-score">
                            <span class="report-score__value">${report.aptitude_score || '-'}%</span>
                            <span class="report-score__label">Aptitude Score</span>
                        </div>
                        <span class="report-status report-status--${report.status}">${report.status}</span>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
        document.getElementById('stat-reports').textContent = result.data.length;
    } else {
        if (emptyState) emptyState.style.display = 'block';
    }
}

async function viewReport(reportId) {
    const result = await apiCall(`reports.php?action=get&id=${reportId}`);
    if (!result.success) { alert('Could not load report.'); return; }

    const r = result.data;
    const modal = document.getElementById('report-modal');
    const content = document.getElementById('report-detail-content');

    let careersHtml = '';
    if (r.recommended_careers && r.recommended_careers.length > 0) {
        r.recommended_careers.forEach(c => {
            careersHtml += `
                <div class="recommendation-item">
                    <span class="recommendation-item__title">${c.title} (${c.category})</span>
                    <span class="recommendation-item__match">${c.match_percentage}%</span>
                </div>`;
        });
    }

    let strengthsHtml = '';
    if (r.strengths) {
        r.strengths.forEach(s => { strengthsHtml += `<li>${s}</li>`; });
    }

    let areasHtml = '';
    if (r.areas_to_improve) {
        r.areas_to_improve.forEach(a => { areasHtml += `<li>${a}</li>`; });
    }

    content.innerHTML = `
        <div class="report-detail">
            <h3>${r.report_title || 'Career Recommendation Report'}</h3>
            <div class="report-detail__summary">${r.summary || ''}</div>

            <h4>🎯 Top Career Recommendations</h4>
            <div class="recommendation-list">${careersHtml}</div>

            <h4>💪 Your Strengths</h4>
            <ul class="report-detail__list">${strengthsHtml}</ul>

            <h4>📈 Areas to Develop</h4>
            <ul class="report-detail__list">${areasHtml}</ul>
        </div>
    `;

    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Close report modal
const closeReportModal = document.getElementById('close-report-modal');
if (closeReportModal) {
    closeReportModal.addEventListener('click', () => {
        const modal = document.getElementById('report-modal');
        modal.classList.remove('active');
        modal.style.display = 'none';
    });
}

// Generate report after all assessments are complete
async function generateReport(aptitudeScore, interestProfile, personalityProfile) {
    showLoading();

    // Save each assessment
    if (aptitudeScore !== undefined) {
        await apiCall('reports.php?action=save_assessment', {
            method: 'POST',
            body: JSON.stringify({ assessment_type: 'aptitude', responses: {}, score: aptitudeScore })
        });
    }
    if (interestProfile) {
        await apiCall('reports.php?action=save_assessment', {
            method: 'POST',
            body: JSON.stringify({ assessment_type: 'interest', responses: interestProfile })
        });
    }
    if (personalityProfile) {
        await apiCall('reports.php?action=save_assessment', {
            method: 'POST',
            body: JSON.stringify({ assessment_type: 'personality', responses: personalityProfile })
        });
    }

    // Generate the report
    const result = await apiCall('reports.php?action=generate', {
        method: 'POST',
        body: JSON.stringify({
            aptitude_score: aptitudeScore,
            interest_profile: interestProfile,
            personality_profile: personalityProfile
        })
    });

    hideLoading();

    if (result.success) {
        alert('🎉 Your career recommendation report has been generated! Check your Profile to view it.');
        loadReports();
        loadProfile();
    } else {
        console.error('Report generation failed:', result.message);
    }
}

// ==================== INITIALIZATION ====================
// Load careers from API on page load (if authenticated)
const origShowMainContent = showMainContent;
showMainContent = function () {
    origShowMainContent();

    const role = localStorage.getItem('userRole');
    applyRoleBasedNav(role);

    if (role === 'admin') {
        showSection('admin-dashboard');
        loadAdminDashboard();
    } else if (role === 'counsellor') {
        showSection('counsellor-dashboard');
        loadCounsellorDashboard();
    } else {
        loadCareersFromAPI();
        loadProfile();
        loadReports();
    }
};

// ==================== ROLE-BASED NAVIGATION ====================
function applyRoleBasedNav(role) {
    const studentItems = document.querySelectorAll('.nav-student-only');
    const adminItems = document.querySelectorAll('.nav-admin-only');
    const counsellorItems = document.querySelectorAll('.nav-counsellor-only');

    studentItems.forEach(el => el.style.display = role === 'student' ? '' : 'none');
    adminItems.forEach(el => el.style.display = role === 'admin' ? '' : 'none');
    counsellorItems.forEach(el => el.style.display = role === 'counsellor' ? '' : 'none');
}

// ==================== DASHBOARD TABS ====================
document.querySelectorAll('.dash-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const panel = tab.getAttribute('data-panel');
        const parent = tab.closest('.dashboard-section');

        // Deactivate sibling tabs
        tab.parentElement.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Hide sibling panels within same section
        const dashSection = tab.closest('.dashboard-section') || tab.closest('section');
        if (dashSection) {
            dashSection.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
        }

        const targetPanel = document.getElementById(panel);
        if (targetPanel) targetPanel.classList.add('active');
    });
});

// ==================== ADMIN DASHBOARD ====================
async function loadAdminDashboard() {
    const result = await apiCall('admin.php?action=dashboard');
    if (!result.success) return;

    const d = result.data;

    // Update stat cards
    document.getElementById('admin-total-students').textContent = d.total_students;
    document.getElementById('admin-total-assessments').textContent = d.total_assessments;
    document.getElementById('admin-total-reports').textContent = d.total_reports;
    document.getElementById('admin-total-chats').textContent = d.total_chats;

    // Load students table
    loadAdminStudents();
    loadAdminAssessments();
    loadAdminChats();
    renderActivityFeed(d.recent_activity);
}

async function loadAdminStudents(search = '') {
    const url = search ? `admin.php?action=students&search=${encodeURIComponent(search)}` : 'admin.php?action=students';
    const result = await apiCall(url);
    if (!result.success) return;

    const tbody = document.querySelector('#admin-students-table tbody');
    if (!result.data || result.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="dash-empty">No students found.</td></tr>';
        return;
    }

    tbody.innerHTML = result.data.map(s => `
        <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.email}</td>
            <td>${s.stream || '—'}</td>
            <td>${s.reports_count}</td>
            <td>${s.assessments_count}</td>
            <td>${new Date(s.created_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

async function loadAdminAssessments() {
    const result = await apiCall('admin.php?action=assessments');
    if (!result.success) return;

    const tbody = document.querySelector('#admin-assessments-table tbody');
    if (!result.data || result.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="dash-empty">No assessments yet.</td></tr>';
        return;
    }

    tbody.innerHTML = result.data.map(a => `
        <tr>
            <td><strong>${a.student_name}</strong></td>
            <td><span style="text-transform:capitalize">${a.assessment_type}</span></td>
            <td>${a.score ? a.score + '%' : '—'}</td>
            <td>${new Date(a.submitted_at).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

async function loadAdminChats() {
    const result = await apiCall('admin.php?action=chats');
    if (!result.success) return;

    const tbody = document.querySelector('#admin-chats-table tbody');
    if (!result.data || result.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="dash-empty">No chat messages yet.</td></tr>';
        return;
    }

    tbody.innerHTML = result.data.map(c => `
        <tr>
            <td>${c.sender_name || 'User #' + c.sender_id} <small>(${c.sender_role})</small></td>
            <td>${c.receiver_name || 'User #' + c.receiver_id} <small>(${c.receiver_role})</small></td>
            <td>${c.message.substring(0, 80)}${c.message.length > 80 ? '...' : ''}</td>
            <td>${new Date(c.created_at).toLocaleString()}</td>
        </tr>
    `).join('');
}

function renderActivityFeed(activities) {
    const feed = document.getElementById('admin-activity-feed');
    if (!activities || activities.length === 0) {
        feed.innerHTML = '<p class="dash-empty">No activity recorded yet.</p>';
        return;
    }

    feed.innerHTML = activities.map(a => `
        <div class="activity-item">
            <div class="activity-dot ${a.action || 'default'}"></div>
            <div class="activity-content">
                <div class="activity-action">${a.user_name || 'System'} — ${a.action.replace(/_/g, ' ')}</div>
                <div class="activity-details">${a.details || ''}</div>
            </div>
            <span class="activity-time">${new Date(a.created_at).toLocaleString()}</span>
        </div>
    `).join('');
}

// Admin student search
const adminSearchInput = document.getElementById('admin-student-search');
if (adminSearchInput) {
    let searchTimeout;
    adminSearchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => loadAdminStudents(adminSearchInput.value), 400);
    });
}

// ==================== COUNSELLOR DASHBOARD ====================
let currentChatPartner = null;

async function loadCounsellorDashboard() {
    loadCounsellorAppointments();
    loadCounsellorConversations();
    loadCounsellorReports();
    loadCounsellorSaved();
}

async function loadCounsellorAppointments() {
    const result = await apiCall('appointments.php?action=list');
    const container = document.getElementById('c-appointments-list');
    if (!result.success || !result.data || result.data.length === 0) {
        container.innerHTML = '<p class="dash-empty">No appointments scheduled yet.</p>';
        return;
    }

    container.innerHTML = result.data.map(a => {
        const date = new Date(a.appointment_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        const initials = (a.student_name || 'S').charAt(0).toUpperCase();
        const colors = ['#1976D2', '#7C3AED', '#059669', '#F59E0B', '#EC407A'];
        const color = colors[a.student_id % colors.length];
        return `
            <div class="appointment-card">
                <div class="appointment-avatar" style="background:${color}">${initials}</div>
                <div class="appointment-info">
                    <h4>${a.student_name || 'Student'}</h4>
                    <p>📅 ${date} at ${a.appointment_time} · ${a.duration_minutes} min</p>
                    ${a.student_notes ? `<p>📝 ${a.student_notes}</p>` : ''}
                </div>
                <span class="appointment-status ${a.status}">${a.status}</span>
                ${a.status === 'pending' ? `
                    <div class="appointment-actions">
                        <button class="btn btn--primary btn--small" onclick="updateAppointment(${a.id}, 'confirmed')">Confirm</button>
                        <button class="btn btn--small" onclick="updateAppointment(${a.id}, 'cancelled')">Cancel</button>
                    </div>` : ''}
                ${a.status === 'confirmed' ? `
                    <div class="appointment-actions">
                        <button class="btn btn--primary btn--small" onclick="updateAppointment(${a.id}, 'completed')">Complete</button>
                    </div>` : ''}
            </div>
        `;
    }).join('');
}

async function updateAppointment(id, status) {
    const result = await apiCall(`appointments.php?action=update&id=${id}`, {
        method: 'POST',
        body: JSON.stringify({ status })
    });
    if (result.success) {
        loadCounsellorAppointments();
    } else {
        alert(result.message || 'Failed to update appointment');
    }
}

async function loadCounsellorConversations() {
    const result = await apiCall('chat_api.php?action=conversations');
    const container = document.getElementById('c-chat-list');
    if (!result.success || !result.data || result.data.length === 0) {
        container.innerHTML = '<p class="dash-empty">No conversations yet.</p>';
        return;
    }

    container.innerHTML = result.data.map(c => {
        const initials = (c.partner_name || 'U').charAt(0).toUpperCase();
        return `
            <div class="c-chat-contact" onclick="openCounsellorChat(${c.partner_id}, '${c.partner_role}', '${c.partner_name.replace(/'/g, "\\'")}')"
                 data-partner-id="${c.partner_id}">
                <div class="c-chat-contact-avatar">${initials}</div>
                <div class="c-chat-contact-info">
                    <div class="c-chat-contact-name">${c.partner_name}</div>
                    <div class="c-chat-contact-preview">${c.last_message || ''}</div>
                </div>
                ${c.unread_count > 0 ? `<div class="c-chat-contact-badge">${c.unread_count}</div>` : ''}
            </div>
        `;
    }).join('');
}

async function openCounsellorChat(partnerId, partnerRole, partnerName) {
    currentChatPartner = { id: partnerId, role: partnerRole, name: partnerName };
    document.getElementById('c-chat-partner-name').textContent = partnerName;
    document.getElementById('c-chat-window').style.display = 'flex';

    // Highlight active contact
    document.querySelectorAll('.c-chat-contact').forEach(c => c.classList.remove('active'));
    const activeContact = document.querySelector(`.c-chat-contact[data-partner-id="${partnerId}"]`);
    if (activeContact) activeContact.classList.add('active');

    // Load chat history
    const result = await apiCall(`chat_api.php?action=history&with=${partnerId}&with_role=${partnerRole}`);
    const container = document.getElementById('c-chat-messages');
    const myId = parseInt(localStorage.getItem('userId'));

    if (!result.success || !result.data || result.data.length === 0) {
        container.innerHTML = '<p class="dash-empty">No messages yet. Start the conversation!</p>';
        return;
    }

    container.innerHTML = result.data.map(m => {
        const isSent = m.sender_id == myId;
        const time = new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `<div class="c-msg ${isSent ? 'sent' : 'received'}">${m.message}<span class="c-msg-time">${time}</span></div>`;
    }).join('');

    container.scrollTop = container.scrollHeight;
}

// Counsellor send message
const cSendBtn = document.getElementById('c-send-msg-btn');
const cChatInput = document.getElementById('c-chat-input');
if (cSendBtn) {
    cSendBtn.addEventListener('click', sendCounsellorMessage);
}
if (cChatInput) {
    cChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendCounsellorMessage();
    });
}

async function sendCounsellorMessage() {
    if (!currentChatPartner) return;
    const input = document.getElementById('c-chat-input');
    const message = input.value.trim();
    if (!message) return;

    const result = await apiCall('chat_api.php?action=send', {
        method: 'POST',
        body: JSON.stringify({
            receiver_id: currentChatPartner.id,
            receiver_role: currentChatPartner.role,
            message
        })
    });

    if (result.success) {
        input.value = '';
        // Append message to UI
        const container = document.getElementById('c-chat-messages');
        const emptyMsg = container.querySelector('.dash-empty');
        if (emptyMsg) emptyMsg.remove();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        container.innerHTML += `<div class="c-msg sent">${message}<span class="c-msg-time">${time}</span></div>`;
        container.scrollTop = container.scrollHeight;
    }
}

// Save chat button
const saveChatBtn = document.getElementById('c-save-chat-btn');
if (saveChatBtn) {
    saveChatBtn.addEventListener('click', async () => {
        if (!currentChatPartner) return;
        const result = await apiCall('chat_api.php?action=save', {
            method: 'POST',
            body: JSON.stringify({ partner_id: currentChatPartner.id, save: 1 })
        });
        if (result.success) {
            alert('Chat conversation saved!');
            loadCounsellorSaved();
        }
    });
}

async function loadCounsellorReports() {
    // Fetch all reports (counsellors can view via reports API)
    const result = await apiCall('reports.php?action=list');
    const tbody = document.querySelector('#c-reports-table tbody');
    if (!result.success || !result.data || result.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="dash-empty">No student reports yet.</td></tr>';
        return;
    }

    tbody.innerHTML = result.data.map(r => `
        <tr>
            <td>${r.user_name || 'Student #' + r.user_id}</td>
            <td>${r.report_title || 'Career Report'}</td>
            <td>${r.aptitude_score ? r.aptitude_score + '%' : '—'}</td>
            <td><span class="appointment-status ${r.status}">${r.status}</span></td>
            <td>${new Date(r.generated_at).toLocaleDateString()}</td>
            <td><button class="btn btn--small" onclick="reviewReport(${r.id})">Review</button></td>
        </tr>
    `).join('');
}

async function reviewReport(reportId) {
    const result = await apiCall(`reports.php?action=get&id=${reportId}`);
    if (result.success && result.data) {
        alert(`Report: ${result.data.report_title}\nScore: ${result.data.aptitude_score}%\nStatus: ${result.data.status}`);
    }
}

async function loadCounsellorSaved() {
    const result = await apiCall('chat_api.php?action=saved');
    const container = document.getElementById('c-saved-list');
    if (!result.success || !result.data || result.data.length === 0) {
        container.innerHTML = '<p class="dash-empty">No saved conversations.</p>';
        return;
    }

    container.innerHTML = result.data.map(s => `
        <div class="saved-chat-item" onclick="openCounsellorChat(${s.partner_id}, '${s.partner_role}', '${s.partner_name.replace(/'/g, "\\'")}}')">
            <div class="c-chat-contact-avatar">${(s.partner_name || 'U').charAt(0)}</div>
            <div>
                <div class="c-chat-contact-name">${s.partner_name}</div>
                <div class="c-chat-contact-preview">Saved conversation · ${s.partner_role}</div>
            </div>
        </div>
    `).join('');
}

// ==================== STUDENT PERSISTENT CHAT ====================
// Override the student chat send to also save to DB
const studentSendBtn = document.getElementById('send-message');
const studentChatInput = document.getElementById('chat-input');

if (studentSendBtn) {
    const originalClickHandlers = studentSendBtn.onclick;
    studentSendBtn.addEventListener('click', async () => {
        const message = studentChatInput.value.trim();
        if (!message) return;

        // Determine current counselor from the active chat
        const counselorName = document.getElementById('chat-counselor-name')?.textContent;
        // For the student chat, we save messages to DB if logged in
        const role = localStorage.getItem('userRole');
        if (role === 'student') {
            // Just save to DB in background — the existing chat UI handles display
            const activeCard = document.querySelector('.counselor-card.active, .counselor-card[style*="border"]');
            // We'll use counselor ID 2 as default (Sarah Johnson) since student chat is simulated
            apiCall('chat_api.php?action=send', {
                method: 'POST',
                body: JSON.stringify({
                    receiver_id: 2,
                    receiver_role: 'counsellor',
                    message: message
                })
            }).catch(() => { }); // Background save — don't block UI
        }
    });
}

console.log('Career Compass initialized successfully!');
console.log('Navigate through sections using the menu.');
console.log('Complete assessments to unlock personalized career recommendations.');
