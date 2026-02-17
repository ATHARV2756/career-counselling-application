<?php
/**
 * Career Compass - Careers API
 *
 * Endpoints:
 *   GET  ?action=list                    — List all careers (with optional filters)
 *   GET  ?action=list&category=X         — Filter by category
 *   GET  ?action=list&stream=X           — Filter by stream
 *   GET  ?action=list&search=X           — Search by title/description/skills
 *   GET  ?action=get&id=X               — Get single career by ID
 *   POST ?action=create                  — Create career (admin only)
 *   PUT  ?action=update&id=X            — Update career (admin only)
 *   DELETE ?action=delete&id=X          — Delete career (admin only)
 *   GET  ?action=categories             — Get all distinct categories
 *   GET  ?action=streams                — Get all distinct streams
 */

require_once '../config/cors.php';
require_once '../config/database.php';

session_start();

$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : 'list';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'list':
        handleList($db);
        break;

    case 'get':
        handleGet($db);
        break;

    case 'create':
        requireAdmin();
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleCreate($db);
        break;

    case 'update':
        requireAdmin();
        if ($method !== 'PUT' && $method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleUpdate($db);
        break;

    case 'delete':
        requireAdmin();
        if ($method !== 'DELETE' && $method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleDelete($db);
        break;

    case 'categories':
        handleCategories($db);
        break;

    case 'streams':
        handleStreams($db);
        break;

    default:
        sendError('Invalid action', 400);
}

// ======================== HANDLERS ========================

function handleList($db)
{
    $where = ["is_active = 1"];
    $params = [];

    // Category filter
    if (!empty($_GET['category']) && $_GET['category'] !== 'all') {
        $where[] = "category = ?";
        $params[] = $_GET['category'];
    }

    // Stream filter
    if (!empty($_GET['stream']) && $_GET['stream'] !== 'all') {
        $where[] = "stream = ?";
        $params[] = $_GET['stream'];
    }

    // Search filter
    if (!empty($_GET['search'])) {
        $search = '%' . $_GET['search'] . '%';
        $where[] = "(title LIKE ? OR description LIKE ? OR skills LIKE ?)";
        $params[] = $search;
        $params[] = $search;
        $params[] = $search;
    }

    $whereClause = implode(' AND ', $where);
    $sql = "SELECT id, title, category, stream, description, salary_range, growth, skills, roadmap, education_required FROM careers WHERE $whereClause ORDER BY title ASC";

    try {
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $careers = $stmt->fetchAll();

        // Parse JSON fields
        foreach ($careers as &$career) {
            $career['skills'] = json_decode($career['skills'], true) ?: [];
            $career['roadmap'] = json_decode($career['roadmap'], true) ?: [];
        }

        sendSuccess($careers, 'Careers retrieved', 200, count($careers));

    } catch (PDOException $e) {
        sendError('Failed to retrieve careers: ' . $e->getMessage(), 500);
    }
}

function handleGet($db)
{
    if (empty($_GET['id'])) {
        sendError('Career ID is required', 400);
    }

    try {
        $stmt = $db->prepare("SELECT * FROM careers WHERE id = ? AND is_active = 1");
        $stmt->execute([$_GET['id']]);
        $career = $stmt->fetch();

        if (!$career) {
            sendError('Career not found', 404);
        }

        $career['skills'] = json_decode($career['skills'], true) ?: [];
        $career['roadmap'] = json_decode($career['roadmap'], true) ?: [];
        $career['match_keywords'] = json_decode($career['match_keywords'], true) ?: [];

        sendSuccess($career, 'Career retrieved');

    } catch (PDOException $e) {
        sendError('Failed to retrieve career: ' . $e->getMessage(), 500);
    }
}

function handleCreate($db)
{
    $data = json_decode(file_get_contents("php://input"), true);

    $required = ['title', 'category', 'stream', 'description'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            sendError("Field '$field' is required", 400);
        }
    }

    try {
        $stmt = $db->prepare("INSERT INTO careers (title, category, stream, description, salary_range, growth, skills, roadmap, education_required, match_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['title'],
            $data['category'],
            $data['stream'],
            $data['description'],
            $data['salary_range'] ?? null,
            $data['growth'] ?? null,
            json_encode($data['skills'] ?? []),
            json_encode($data['roadmap'] ?? []),
            $data['education_required'] ?? null,
            json_encode($data['match_keywords'] ?? [])
        ]);

        sendSuccess(['id' => (int) $db->lastInsertId()], 'Career created', 201);

    } catch (PDOException $e) {
        sendError('Failed to create career: ' . $e->getMessage(), 500);
    }
}

function handleUpdate($db)
{
    if (empty($_GET['id'])) {
        sendError('Career ID is required', 400);
    }

    $data = json_decode(file_get_contents("php://input"), true);

    $fields = [];
    $params = [];

    $allowedFields = ['title', 'category', 'stream', 'description', 'salary_range', 'growth', 'education_required'];
    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $params[] = $data[$field];
        }
    }

    // JSON fields
    $jsonFields = ['skills', 'roadmap', 'match_keywords'];
    foreach ($jsonFields as $field) {
        if (isset($data[$field])) {
            $fields[] = "$field = ?";
            $params[] = json_encode($data[$field]);
        }
    }

    if (empty($fields)) {
        sendError('No fields to update', 400);
    }

    $params[] = $_GET['id'];

    try {
        $stmt = $db->prepare("UPDATE careers SET " . implode(', ', $fields) . " WHERE id = ?");
        $stmt->execute($params);

        sendSuccess(null, 'Career updated');

    } catch (PDOException $e) {
        sendError('Failed to update career: ' . $e->getMessage(), 500);
    }
}

function handleDelete($db)
{
    if (empty($_GET['id'])) {
        sendError('Career ID is required', 400);
    }

    try {
        // Soft delete
        $stmt = $db->prepare("UPDATE careers SET is_active = 0 WHERE id = ?");
        $stmt->execute([$_GET['id']]);

        sendSuccess(null, 'Career deleted');

    } catch (PDOException $e) {
        sendError('Failed to delete career: ' . $e->getMessage(), 500);
    }
}

function handleCategories($db)
{
    try {
        $stmt = $db->query("SELECT DISTINCT category FROM careers WHERE is_active = 1 ORDER BY category ASC");
        $categories = $stmt->fetchAll(PDO::FETCH_COLUMN);
        sendSuccess($categories, 'Categories retrieved');
    } catch (PDOException $e) {
        sendError('Failed to retrieve categories: ' . $e->getMessage(), 500);
    }
}

function handleStreams($db)
{
    try {
        $stmt = $db->query("SELECT DISTINCT stream FROM careers WHERE is_active = 1 ORDER BY stream ASC");
        $streams = $stmt->fetchAll(PDO::FETCH_COLUMN);
        sendSuccess($streams, 'Streams retrieved');
    } catch (PDOException $e) {
        sendError('Failed to retrieve streams: ' . $e->getMessage(), 500);
    }
}

// ======================== HELPERS ========================

function requireAdmin()
{
    if (!isset($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
        sendError('Admin access required', 403);
    }
}

function sendSuccess($data, $message = 'Success', $code = 200, $total = null)
{
    http_response_code($code);
    $response = [
        'success' => true,
        'message' => $message,
        'data' => $data
    ];
    if ($total !== null) {
        $response['total'] = $total;
    }
    echo json_encode($response);
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