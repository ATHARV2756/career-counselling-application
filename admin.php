<?php
/**
 * Career Compass - Admin Dashboard API
 * 
 * Endpoints:
 *   GET ?action=dashboard       — Overview stats
 *   GET ?action=students        — List all students
 *   GET ?action=student_detail  — Single student detail
 *   GET ?action=assessments     — List all assessments
 *   GET ?action=chats           — List all chat conversations
 *   GET ?action=activity        — Activity log feed
 */

require_once '../config/cors.php';
require_once '../config/database.php';

session_start();

// Check admin authentication
if (!isset($_SESSION['user_id']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($action) {
    case 'dashboard':
        handleDashboard($db);
        break;
    case 'students':
        handleStudents($db);
        break;
    case 'student_detail':
        handleStudentDetail($db);
        break;
    case 'assessments':
        handleAssessments($db);
        break;
    case 'chats':
        handleChats($db);
        break;
    case 'activity':
        handleActivity($db);
        break;
    default:
        sendError('Invalid action', 400);
}

// ======================== HANDLERS ========================

function handleDashboard($db)
{
    try {
        // Total students
        $stmt = $db->query("SELECT COUNT(*) as count FROM users");
        $totalStudents = $stmt->fetch()['count'];

        // Total assessments
        $stmt = $db->query("SELECT COUNT(*) as count FROM assessment_responses");
        $totalAssessments = $stmt->fetch()['count'];

        // Total reports
        $stmt = $db->query("SELECT COUNT(*) as count FROM reports");
        $totalReports = $stmt->fetch()['count'];

        // Total counsellors
        $stmt = $db->query("SELECT COUNT(*) as count FROM admins WHERE role = 'counsellor'");
        $totalCounsellors = $stmt->fetch()['count'];

        // Total chat messages
        $stmt = $db->query("SELECT COUNT(*) as count FROM chat_messages");
        $totalChats = $stmt->fetch()['count'];

        // Total appointments
        $stmt = $db->query("SELECT COUNT(*) as count FROM appointments");
        $totalAppointments = $stmt->fetch()['count'];

        // Recent students (last 5)
        $stmt = $db->query("SELECT id, name, email, stream, created_at FROM users ORDER BY created_at DESC LIMIT 5");
        $recentStudents = $stmt->fetchAll();

        // Recent activity (last 10)
        $stmt = $db->query("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 10");
        $recentActivity = $stmt->fetchAll();

        // Assessments by type
        $stmt = $db->query("SELECT assessment_type, COUNT(*) as count FROM assessment_responses GROUP BY assessment_type");
        $assessmentsByType = $stmt->fetchAll();

        sendSuccess([
            'total_students' => (int) $totalStudents,
            'total_assessments' => (int) $totalAssessments,
            'total_reports' => (int) $totalReports,
            'total_counsellors' => (int) $totalCounsellors,
            'total_chats' => (int) $totalChats,
            'total_appointments' => (int) $totalAppointments,
            'recent_students' => $recentStudents,
            'recent_activity' => $recentActivity,
            'assessments_by_type' => $assessmentsByType
        ]);
    } catch (PDOException $e) {
        sendError('Failed to load dashboard: ' . $e->getMessage(), 500);
    }
}

function handleStudents($db)
{
    try {
        $search = isset($_GET['search']) ? trim($_GET['search']) : '';

        if ($search) {
            $stmt = $db->prepare("SELECT u.id, u.name, u.email, u.phone, u.stream, u.grade_level, u.created_at,
                (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as reports_count,
                (SELECT COUNT(*) FROM assessment_responses WHERE user_id = u.id) as assessments_count
                FROM users u WHERE u.name LIKE ? OR u.email LIKE ? ORDER BY u.created_at DESC");
            $like = "%$search%";
            $stmt->execute([$like, $like]);
        } else {
            $stmt = $db->query("SELECT u.id, u.name, u.email, u.phone, u.stream, u.grade_level, u.created_at,
                (SELECT COUNT(*) FROM reports WHERE user_id = u.id) as reports_count,
                (SELECT COUNT(*) FROM assessment_responses WHERE user_id = u.id) as assessments_count
                FROM users u ORDER BY u.created_at DESC");
        }

        $students = $stmt->fetchAll();
        sendSuccess($students, 'Students retrieved', 200, count($students));
    } catch (PDOException $e) {
        sendError('Failed to load students: ' . $e->getMessage(), 500);
    }
}

function handleStudentDetail($db)
{
    if (empty($_GET['id'])) {
        sendError('Student ID is required', 400);
    }

    $studentId = (int) $_GET['id'];

    try {
        // Student info
        $stmt = $db->prepare("SELECT id, name, email, phone, date_of_birth, stream, grade_level, created_at FROM users WHERE id = ?");
        $stmt->execute([$studentId]);
        $student = $stmt->fetch();

        if (!$student) {
            sendError('Student not found', 404);
        }

        // Assessments
        $stmt = $db->prepare("SELECT * FROM assessment_responses WHERE user_id = ? ORDER BY submitted_at DESC");
        $stmt->execute([$studentId]);
        $assessments = $stmt->fetchAll();

        // Reports
        $stmt = $db->prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY generated_at DESC");
        $stmt->execute([$studentId]);
        $reports = $stmt->fetchAll();
        foreach ($reports as &$r) {
            if ($r['recommended_careers'])
                $r['recommended_careers'] = json_decode($r['recommended_careers'], true);
            if ($r['strengths'])
                $r['strengths'] = json_decode($r['strengths'], true);
            if ($r['areas_to_improve'])
                $r['areas_to_improve'] = json_decode($r['areas_to_improve'], true);
        }

        // Chat messages
        $stmt = $db->prepare("SELECT * FROM chat_messages WHERE sender_id = ? AND sender_role = 'student' OR receiver_id = ? AND receiver_role = 'student' ORDER BY created_at DESC LIMIT 50");
        $stmt->execute([$studentId, $studentId]);
        $chats = $stmt->fetchAll();

        sendSuccess([
            'student' => $student,
            'assessments' => $assessments,
            'reports' => $reports,
            'chats' => $chats
        ]);
    } catch (PDOException $e) {
        sendError('Failed to load student detail: ' . $e->getMessage(), 500);
    }
}

function handleAssessments($db)
{
    try {
        $stmt = $db->query("SELECT ar.*, u.name as student_name, u.email as student_email 
            FROM assessment_responses ar 
            JOIN users u ON ar.user_id = u.id 
            ORDER BY ar.submitted_at DESC");
        $assessments = $stmt->fetchAll();

        foreach ($assessments as &$a) {
            if ($a['responses'])
                $a['responses'] = json_decode($a['responses'], true);
        }

        sendSuccess($assessments, 'Assessments retrieved', 200, count($assessments));
    } catch (PDOException $e) {
        sendError('Failed to load assessments: ' . $e->getMessage(), 500);
    }
}

function handleChats($db)
{
    try {
        // Get distinct conversations with latest message
        $stmt = $db->query("SELECT cm.*,
            CASE WHEN cm.sender_role = 'student' THEN (SELECT name FROM users WHERE id = cm.sender_id)
                 ELSE (SELECT name FROM admins WHERE id = cm.sender_id) END as sender_name,
            CASE WHEN cm.receiver_role = 'student' THEN (SELECT name FROM users WHERE id = cm.receiver_id)
                 ELSE (SELECT name FROM admins WHERE id = cm.receiver_id) END as receiver_name
            FROM chat_messages cm
            ORDER BY cm.created_at DESC
            LIMIT 100");
        $chats = $stmt->fetchAll();

        sendSuccess($chats, 'Chats retrieved', 200, count($chats));
    } catch (PDOException $e) {
        sendError('Failed to load chats: ' . $e->getMessage(), 500);
    }
}

function handleActivity($db)
{
    try {
        $limit = isset($_GET['limit']) ? min((int) $_GET['limit'], 100) : 30;

        $stmt = $db->prepare("SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?");
        $stmt->bindValue(1, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $activity = $stmt->fetchAll();

        sendSuccess($activity, 'Activity retrieved', 200, count($activity));
    } catch (PDOException $e) {
        sendError('Failed to load activity: ' . $e->getMessage(), 500);
    }
}

// ======================== HELPERS ========================

function sendSuccess($data, $message = 'Success', $code = 200, $total = null)
{
    http_response_code($code);
    $response = ['success' => true, 'message' => $message, 'data' => $data];
    if ($total !== null)
        $response['total'] = $total;
    echo json_encode($response);
    exit;
}

function sendError($message, $code = 400)
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
?>