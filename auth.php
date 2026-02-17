<?php
/**
 * Career Compass - Authentication API
 * 
 * Endpoints:
 *   POST ?action=register  — Register a new user (student/counsellor/admin)
 *   POST ?action=login     — Login for any role
 *   GET  ?action=profile   — Get current user profile (requires session)
 *   POST ?action=logout    — Destroy session
 */

require_once '../config/cors.php';
require_once '../config/database.php';

session_start();

$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'register':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleRegister($db);
        break;

    case 'login':
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleLogin($db);
        break;

    case 'profile':
        if ($method !== 'GET') {
            sendError('Method not allowed', 405);
        }
        handleProfile($db);
        break;

    case 'logout':
        handleLogout();
        break;

    default:
        sendError('Invalid action. Use: register, login, profile, logout', 400);
}

// ======================== HANDLERS ========================

function handleRegister($db)
{
    $data = json_decode(file_get_contents("php://input"), true);

    // Validate required fields
    $required = ['name', 'email', 'password', 'role'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            sendError("Field '$field' is required", 400);
        }
    }

    $name = trim($data['name']);
    $email = trim(strtolower($data['email']));
    $password = $data['password'];
    $role = strtolower($data['role']);

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendError('Invalid email format', 400);
    }

    // Validate password length
    if (strlen($password) < 8) {
        sendError('Password must be at least 8 characters', 400);
    }

    // Validate role
    $validRoles = ['student', 'counsellor', 'admin'];
    if (!in_array($role, $validRoles)) {
        sendError('Invalid role. Must be: student, counsellor, or admin', 400);
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    try {
        if ($role === 'student') {
            // Check if email already exists in users table
            $check = $db->prepare("SELECT id FROM users WHERE email = ?");
            $check->execute([$email]);
            if ($check->fetch()) {
                sendError('Email already registered', 409);
            }

            $stmt = $db->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
            $stmt->execute([$name, $email, $hashedPassword]);
            $userId = $db->lastInsertId();

            // Set session
            $_SESSION['user_id'] = $userId;
            $_SESSION['user_role'] = 'student';
            $_SESSION['user_name'] = $name;
            $_SESSION['user_email'] = $email;

            sendSuccess([
                'id' => (int) $userId,
                'name' => $name,
                'email' => $email,
                'role' => 'student'
            ], 'Registration successful', 201);

        } else {
            // Admin or counsellor — store in admins table
            $check = $db->prepare("SELECT id FROM admins WHERE email = ?");
            $check->execute([$email]);
            if ($check->fetch()) {
                sendError('Email already registered', 409);
            }

            $specialty = isset($data['specialty']) ? trim($data['specialty']) : null;
            $experience = isset($data['experience']) ? trim($data['experience']) : null;

            $stmt = $db->prepare("INSERT INTO admins (name, email, password, role, specialty, experience) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $email, $hashedPassword, $role, $specialty, $experience]);
            $userId = $db->lastInsertId();

            $_SESSION['user_id'] = $userId;
            $_SESSION['user_role'] = $role;
            $_SESSION['user_name'] = $name;
            $_SESSION['user_email'] = $email;

            sendSuccess([
                'id' => (int) $userId,
                'name' => $name,
                'email' => $email,
                'role' => $role
            ], 'Registration successful', 201);
        }
    } catch (PDOException $e) {
        sendError('Registration failed: ' . $e->getMessage(), 500);
    }
}

function handleLogin($db)
{
    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['password']) || empty($data['role'])) {
        sendError('Password and role are required', 400);
    }

    $password = $data['password'];
    $role = strtolower($data['role']);

    try {
        if ($role === 'student') {
            if (empty($data['email'])) {
                sendError('Email is required', 400);
            }
            $email = trim(strtolower($data['email']));

            $stmt = $db->prepare("SELECT id, name, email, password FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password'])) {
                sendError('Invalid email or password', 401);
            }

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_role'] = 'student';
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];

            // Log activity
            logActivity($db, $user['id'], 'student', $user['name'], 'login', 'Student logged in');

            sendSuccess([
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => 'student'
            ], 'Login successful');

        } elseif ($role === 'admin') {
            // Admin login requires admin_code
            if (empty($data['admin_code'])) {
                sendError('Admin code is required', 400);
            }
            if (empty($data['email'])) {
                sendError('Admin email is required', 400);
            }
            $email = trim(strtolower($data['email']));
            $adminCode = trim($data['admin_code']);

            $stmt = $db->prepare("SELECT id, name, email, password, role, admin_code FROM admins WHERE email = ? AND role = 'admin'");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password'])) {
                sendError('Invalid email or password', 401);
            }

            if ($user['admin_code'] !== $adminCode) {
                sendError('Invalid admin code', 401);
            }

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_role'] = 'admin';
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];

            logActivity($db, $user['id'], 'admin', $user['name'], 'login', 'Admin logged in');

            sendSuccess([
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => 'admin'
            ], 'Login successful');

        } elseif ($role === 'counsellor') {
            // Counsellor login requires counsellor_id
            if (empty($data['counsellor_id'])) {
                sendError('Counsellor ID is required', 400);
            }
            if (empty($data['email'])) {
                sendError('Email is required', 400);
            }
            $email = trim(strtolower($data['email']));
            $counsellorId = trim($data['counsellor_id']);

            $stmt = $db->prepare("SELECT id, name, email, password, role, counsellor_id, specialty, experience, rating, avatar_color, bio FROM admins WHERE email = ? AND role = 'counsellor'");
            $stmt->execute([$email]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password'])) {
                sendError('Invalid email or password', 401);
            }

            if ($user['counsellor_id'] !== $counsellorId) {
                sendError('Invalid counsellor ID', 401);
            }

            $_SESSION['user_id'] = $user['id'];
            $_SESSION['user_role'] = 'counsellor';
            $_SESSION['user_name'] = $user['name'];
            $_SESSION['user_email'] = $user['email'];

            logActivity($db, $user['id'], 'counsellor', $user['name'], 'login', 'Counsellor logged in');

            sendSuccess([
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => 'counsellor',
                'counsellor_id' => $user['counsellor_id'],
                'specialty' => $user['specialty'],
                'experience' => $user['experience'],
                'rating' => (float) $user['rating']
            ], 'Login successful');

        } else {
            sendError('Invalid role', 400);
        }
    } catch (PDOException $e) {
        sendError('Login failed: ' . $e->getMessage(), 500);
    }
}

function handleProfile($db)
{
    if (!isset($_SESSION['user_id'])) {
        sendError('Not authenticated. Please login.', 401);
    }

    $userId = $_SESSION['user_id'];
    $role = $_SESSION['user_role'];

    try {
        if ($role === 'student') {
            $stmt = $db->prepare("SELECT id, name, email, phone, date_of_birth, stream, grade_level, created_at FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if (!$user) {
                sendError('User not found', 404);
            }

            // Also fetch reports count
            $reportStmt = $db->prepare("SELECT COUNT(*) as count FROM reports WHERE user_id = ?");
            $reportStmt->execute([$userId]);
            $reportCount = $reportStmt->fetch()['count'];

            $user['role'] = 'student';
            $user['reports_count'] = (int) $reportCount;

            sendSuccess($user, 'Profile retrieved');
        } else {
            $stmt = $db->prepare("SELECT id, name, email, role, specialty, experience, rating, bio, counsellor_id, created_at FROM admins WHERE id = ?");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();

            if (!$user) {
                sendError('User not found', 404);
            }
            sendSuccess($user, 'Profile retrieved');
        }
    } catch (PDOException $e) {
        sendError('Failed to retrieve profile: ' . $e->getMessage(), 500);
    }
}

function handleLogout()
{
    session_unset();
    session_destroy();
    sendSuccess(null, 'Logged out successfully');
}

// ======================== HELPERS ========================

function logActivity($db, $userId, $role, $name, $action, $details)
{
    try {
        $stmt = $db->prepare("INSERT INTO activity_log (user_id, user_role, user_name, action, details) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$userId, $role, $name, $action, $details]);
    } catch (PDOException $e) {
        // Silently fail — activity log is non-critical
    }
}

function sendSuccess($data, $message = 'Success', $code = 200)
{
    http_response_code($code);
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

function sendError($message, $code = 400)
{
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
    exit;
}
?>