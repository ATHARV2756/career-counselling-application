<?php
/**
 * Career Compass - Chat API (Persistent Chat Storage)
 * 
 * Endpoints:
 *   POST ?action=send             — Send a message
 *   GET  ?action=history&with=X   — Get chat history with a user
 *   GET  ?action=conversations    — List all conversations for current user
 *   POST ?action=save             — Toggle save/bookmark a conversation
 *   GET  ?action=saved            — List saved conversations
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
    case 'send':
        if ($method !== 'POST')
            sendError('Method not allowed', 405);
        handleSend($db);
        break;
    case 'history':
        handleHistory($db);
        break;
    case 'conversations':
        handleConversations($db);
        break;
    case 'save':
        if ($method !== 'POST')
            sendError('Method not allowed', 405);
        handleSave($db);
        break;
    case 'saved':
        handleSaved($db);
        break;
    default:
        sendError('Invalid action', 400);
}

// ======================== HANDLERS ========================

function handleSend($db)
{
    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['receiver_id']) || empty($data['receiver_role']) || empty($data['message'])) {
        sendError('receiver_id, receiver_role, and message are required', 400);
    }

    $senderId = $_SESSION['user_id'];
    $senderRole = $_SESSION['user_role'];
    $receiverId = (int) $data['receiver_id'];
    $receiverRole = $data['receiver_role'];
    $message = trim($data['message']);

    if (empty($message)) {
        sendError('Message cannot be empty', 400);
    }

    try {
        $stmt = $db->prepare("INSERT INTO chat_messages (sender_id, sender_role, receiver_id, receiver_role, message) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$senderId, $senderRole, $receiverId, $receiverRole, $message]);

        $msgId = $db->lastInsertId();

        // Log activity
        try {
            $stmt2 = $db->prepare("INSERT INTO activity_log (user_id, user_role, user_name, action, details) VALUES (?, ?, ?, 'chat_message', ?)");
            $stmt2->execute([$senderId, $senderRole, $_SESSION['user_name'], "Sent message to $receiverRole #$receiverId"]);
        } catch (PDOException $e) {
            // Non-critical
        }

        sendSuccess([
            'id' => (int) $msgId,
            'sender_id' => $senderId,
            'sender_role' => $senderRole,
            'receiver_id' => $receiverId,
            'receiver_role' => $receiverRole,
            'message' => $message
        ], 'Message sent', 201);
    } catch (PDOException $e) {
        sendError('Failed to send message: ' . $e->getMessage(), 500);
    }
}

function handleHistory($db)
{
    if (empty($_GET['with'])) {
        sendError('with parameter (user ID) is required', 400);
    }

    $currentId = $_SESSION['user_id'];
    $currentRole = $_SESSION['user_role'];
    $withId = (int) $_GET['with'];
    $withRole = isset($_GET['with_role']) ? $_GET['with_role'] : '';

    try {
        $stmt = $db->prepare("SELECT * FROM chat_messages 
            WHERE (sender_id = ? AND receiver_id = ?) 
               OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at ASC");
        $stmt->execute([$currentId, $withId, $withId, $currentId]);
        $messages = $stmt->fetchAll();

        // Mark messages as read
        $stmt2 = $db->prepare("UPDATE chat_messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0");
        $stmt2->execute([$currentId, $withId]);

        sendSuccess($messages);
    } catch (PDOException $e) {
        sendError('Failed to load chat history: ' . $e->getMessage(), 500);
    }
}

function handleConversations($db)
{
    $currentId = $_SESSION['user_id'];
    $currentRole = $_SESSION['user_role'];

    try {
        // Get unique conversation partners with their latest message
        $stmt = $db->prepare("
            SELECT 
                CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id,
                CASE WHEN sender_id = ? THEN receiver_role ELSE sender_role END as partner_role,
                message as last_message,
                created_at as last_message_at,
                is_saved
            FROM chat_messages 
            WHERE sender_id = ? OR receiver_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$currentId, $currentId, $currentId, $currentId]);
        $allMessages = $stmt->fetchAll();

        // Deduplicate by partner
        $conversations = [];
        $seen = [];
        foreach ($allMessages as $msg) {
            $key = $msg['partner_id'] . '_' . $msg['partner_role'];
            if (!isset($seen[$key])) {
                $seen[$key] = true;

                // Get partner name
                $partnerName = 'Unknown';
                if ($msg['partner_role'] === 'student') {
                    $nameStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
                    $nameStmt->execute([$msg['partner_id']]);
                    $n = $nameStmt->fetch();
                    if ($n)
                        $partnerName = $n['name'];
                } else {
                    $nameStmt = $db->prepare("SELECT name, specialty FROM admins WHERE id = ?");
                    $nameStmt->execute([$msg['partner_id']]);
                    $n = $nameStmt->fetch();
                    if ($n)
                        $partnerName = $n['name'];
                }

                // Count unread
                $unreadStmt = $db->prepare("SELECT COUNT(*) as count FROM chat_messages WHERE sender_id = ? AND receiver_id = ? AND is_read = 0");
                $unreadStmt->execute([$msg['partner_id'], $currentId]);
                $unread = $unreadStmt->fetch()['count'];

                $conversations[] = [
                    'partner_id' => (int) $msg['partner_id'],
                    'partner_role' => $msg['partner_role'],
                    'partner_name' => $partnerName,
                    'last_message' => $msg['last_message'],
                    'last_message_at' => $msg['last_message_at'],
                    'unread_count' => (int) $unread,
                    'is_saved' => (int) $msg['is_saved']
                ];
            }
        }

        sendSuccess($conversations);
    } catch (PDOException $e) {
        sendError('Failed to load conversations: ' . $e->getMessage(), 500);
    }
}

function handleSave($db)
{
    $data = json_decode(file_get_contents("php://input"), true);

    if (empty($data['partner_id'])) {
        sendError('partner_id is required', 400);
    }

    $currentId = $_SESSION['user_id'];
    $partnerId = (int) $data['partner_id'];
    $saveStatus = isset($data['save']) ? (int) $data['save'] : 1;

    try {
        $stmt = $db->prepare("UPDATE chat_messages SET is_saved = ? 
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)");
        $stmt->execute([$saveStatus, $currentId, $partnerId, $partnerId, $currentId]);

        sendSuccess(null, $saveStatus ? 'Conversation saved' : 'Conversation unsaved');
    } catch (PDOException $e) {
        sendError('Failed to save conversation: ' . $e->getMessage(), 500);
    }
}

function handleSaved($db)
{
    $currentId = $_SESSION['user_id'];

    try {
        $stmt = $db->prepare("SELECT DISTINCT 
            CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id,
            CASE WHEN sender_id = ? THEN receiver_role ELSE sender_role END as partner_role
            FROM chat_messages 
            WHERE (sender_id = ? OR receiver_id = ?) AND is_saved = 1");
        $stmt->execute([$currentId, $currentId, $currentId, $currentId]);
        $saved = $stmt->fetchAll();

        // Enrich with partner names
        foreach ($saved as &$s) {
            if ($s['partner_role'] === 'student') {
                $nameStmt = $db->prepare("SELECT name FROM users WHERE id = ?");
            } else {
                $nameStmt = $db->prepare("SELECT name FROM admins WHERE id = ?");
            }
            $nameStmt->execute([$s['partner_id']]);
            $n = $nameStmt->fetch();
            $s['partner_name'] = $n ? $n['name'] : 'Unknown';
        }

        sendSuccess($saved);
    } catch (PDOException $e) {
        sendError('Failed to load saved conversations: ' . $e->getMessage(), 500);
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