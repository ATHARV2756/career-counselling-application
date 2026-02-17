<?php
/**
 * Career Compass - Appointments API
 * 
 * Endpoints:
 *   POST ?action=create        — Book an appointment
 *   GET  ?action=list          — List appointments (role-filtered)
 *   PUT  ?action=update&id=X   — Update appointment status
 */

require_once '../config/cors.php';
require_once '../config/database.php';

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit;
}

$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'create':
        if ($method !== 'POST')
            sendError('Method not allowed', 405);
        handleCreate($db);
        break;
    case 'list':
        handleList($db);
        break;
    case 'update':
        if ($method !== 'PUT' && $method !== 'POST')
            sendError('Method not allowed', 405);
        handleUpdate($db);
        break;
    default:
        sendError('Invalid action', 400);
}

// ======================== HANDLERS ========================

function handleCreate($db)
{
    $data = json_decode(file_get_contents("php://input"), true);

    $required = ['counsellor_id', 'appointment_date', 'appointment_time'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            sendError("Field '$field' is required", 400);
        }
    }

    $studentId = $_SESSION['user_id'];
    $counsellorId = (int) $data['counsellor_id'];
    $date = $data['appointment_date'];
    $time = $data['appointment_time'];
    $notes = isset($data['notes']) ? trim($data['notes']) : null;
    $duration = isset($data['duration']) ? (int) $data['duration'] : 30;

    try {
        // Check if the counsellor exists
        $check = $db->prepare("SELECT id, name FROM admins WHERE id = ? AND role = 'counsellor'");
        $check->execute([$counsellorId]);
        $counsellor = $check->fetch();
        if (!$counsellor) {
            sendError('Counsellor not found', 404);
        }

        // Check for conflicting appointments
        $conflict = $db->prepare("SELECT id FROM appointments WHERE counsellor_id = ? AND appointment_date = ? AND appointment_time = ? AND status NOT IN ('cancelled', 'completed')");
        $conflict->execute([$counsellorId, $date, $time]);
        if ($conflict->fetch()) {
            sendError('This time slot is already booked', 409);
        }

        $stmt = $db->prepare("INSERT INTO appointments (student_id, counsellor_id, appointment_date, appointment_time, duration_minutes, student_notes) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$studentId, $counsellorId, $date, $time, $duration, $notes]);

        $apptId = $db->lastInsertId();

        // Log activity
        try {
            $stmt2 = $db->prepare("INSERT INTO activity_log (user_id, user_role, user_name, action, details) VALUES (?, 'student', ?, 'appointment_created', ?)");
            $stmt2->execute([$studentId, $_SESSION['user_name'], "Appointment with {$counsellor['name']} on $date at $time"]);
        } catch (PDOException $e) {
            // Non-critical
        }

        sendSuccess(['id' => (int) $apptId], 'Appointment booked successfully', 201);
    } catch (PDOException $e) {
        sendError('Failed to create appointment: ' . $e->getMessage(), 500);
    }
}

function handleList($db)
{
    $userId = $_SESSION['user_id'];
    $role = $_SESSION['user_role'];

    try {
        if ($role === 'student') {
            $stmt = $db->prepare("SELECT a.*, ad.name as counsellor_name, ad.specialty, ad.avatar_color 
                FROM appointments a 
                JOIN admins ad ON a.counsellor_id = ad.id 
                WHERE a.student_id = ? 
                ORDER BY a.appointment_date DESC, a.appointment_time DESC");
            $stmt->execute([$userId]);
        } elseif ($role === 'counsellor') {
            $stmt = $db->prepare("SELECT a.*, u.name as student_name, u.email as student_email 
                FROM appointments a 
                JOIN users u ON a.student_id = u.id 
                WHERE a.counsellor_id = ? 
                ORDER BY a.appointment_date ASC, a.appointment_time ASC");
            $stmt->execute([$userId]);
        } else {
            // Admin sees all
            $stmt = $db->query("SELECT a.*, u.name as student_name, u.email as student_email, ad.name as counsellor_name, ad.specialty 
                FROM appointments a 
                JOIN users u ON a.student_id = u.id 
                JOIN admins ad ON a.counsellor_id = ad.id 
                ORDER BY a.appointment_date DESC");
        }

        $appointments = $stmt->fetchAll();
        sendSuccess($appointments, 'Appointments retrieved', 200);
    } catch (PDOException $e) {
        sendError('Failed to load appointments: ' . $e->getMessage(), 500);
    }
}

function handleUpdate($db)
{
    if (empty($_GET['id'])) {
        sendError('Appointment ID is required', 400);
    }

    $data = json_decode(file_get_contents("php://input"), true);
    $apptId = (int) $_GET['id'];
    $userId = $_SESSION['user_id'];
    $role = $_SESSION['user_role'];

    if (empty($data['status'])) {
        sendError('Status is required', 400);
    }

    $validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!in_array($data['status'], $validStatuses)) {
        sendError('Invalid status', 400);
    }

    try {
        // Verify ownership
        $check = $db->prepare("SELECT * FROM appointments WHERE id = ?");
        $check->execute([$apptId]);
        $appt = $check->fetch();
        if (!$appt) {
            sendError('Appointment not found', 404);
        }

        // Only counsellor/admin can confirm, student can cancel their own
        if ($role === 'student' && $appt['student_id'] != $userId) {
            sendError('Not authorized', 403);
        }
        if ($role === 'counsellor' && $appt['counsellor_id'] != $userId) {
            sendError('Not authorized', 403);
        }

        $notes = isset($data['notes']) ? trim($data['notes']) : $appt['notes'];

        $stmt = $db->prepare("UPDATE appointments SET status = ?, notes = ? WHERE id = ?");
        $stmt->execute([$data['status'], $notes, $apptId]);

        sendSuccess(null, 'Appointment updated');
    } catch (PDOException $e) {
        sendError('Failed to update appointment: ' . $e->getMessage(), 500);
    }
}

// ======================== HELPERS ========================

function sendSuccess($data, $message = 'Success', $code = 200)
{
    http_response_code($code);
    echo json_encode(['success' => true, 'message' => $message, 'data' => $data]);
    exit;
}

function sendError($message, $code = 400)
{
    http_response_code($code);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
?>