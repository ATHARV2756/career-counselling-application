<?php
/**
 * Career Compass - Reports API
 *
 * Endpoints:
 *   POST ?action=generate         — Generate a career recommendation report from assessment scores
 *   POST ?action=save_assessment  — Save individual assessment responses
 *   GET  ?action=list             — Get all reports for current user
 *   GET  ?action=get&id=X         — Get a single report by ID
 *   PUT  ?action=review&id=X      — Counsellor reviews a report
 */

require_once '../config/cors.php';
require_once '../config/database.php';

session_start();

$database = new Database();
$db = $database->getConnection();

$action = isset($_GET['action']) ? $_GET['action'] : '';
$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'save_assessment':
        requireAuth();
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleSaveAssessment($db);
        break;

    case 'generate':
        requireAuth();
        if ($method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleGenerate($db);
        break;

    case 'list':
        requireAuth();
        handleListReports($db);
        break;

    case 'get':
        requireAuth();
        handleGetReport($db);
        break;

    case 'review':
        requireCounsellor();
        if ($method !== 'PUT' && $method !== 'POST') {
            sendError('Method not allowed', 405);
        }
        handleReviewReport($db);
        break;

    default:
        sendError('Invalid action. Use: save_assessment, generate, list, get, review', 400);
}

// ======================== HANDLERS ========================

function handleSaveAssessment($db)
{
    $data = json_decode(file_get_contents("php://input"), true);
    $userId = $_SESSION['user_id'];

    if (empty($data['assessment_type']) || !isset($data['responses'])) {
        sendError('assessment_type and responses are required', 400);
    }

    $validTypes = ['aptitude', 'interest', 'personality'];
    if (!in_array($data['assessment_type'], $validTypes)) {
        sendError('Invalid assessment type', 400);
    }

    $score = isset($data['score']) ? $data['score'] : null;

    try {
        // Delete any existing response for this type (allow re-taking)
        $del = $db->prepare("DELETE FROM assessment_responses WHERE user_id = ? AND assessment_type = ?");
        $del->execute([$userId, $data['assessment_type']]);

        $stmt = $db->prepare("INSERT INTO assessment_responses (user_id, assessment_type, responses, score) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $userId,
            $data['assessment_type'],
            json_encode($data['responses']),
            $score
        ]);

        sendSuccess([
            'id' => (int) $db->lastInsertId(),
            'assessment_type' => $data['assessment_type'],
            'score' => $score
        ], 'Assessment saved');

    } catch (PDOException $e) {
        sendError('Failed to save assessment: ' . $e->getMessage(), 500);
    }
}

function handleGenerate($db)
{
    $userId = $_SESSION['user_id'];
    $data = json_decode(file_get_contents("php://input"), true);

    try {
        // Fetch all assessment responses for this user
        $stmt = $db->prepare("SELECT assessment_type, responses, score FROM assessment_responses WHERE user_id = ? ORDER BY submitted_at DESC");
        $stmt->execute([$userId]);
        $assessments = $stmt->fetchAll();

        $aptitudeScore = null;
        $interestProfile = null;
        $personalityProfile = null;

        foreach ($assessments as $assessment) {
            switch ($assessment['assessment_type']) {
                case 'aptitude':
                    $aptitudeScore = (float) $assessment['score'];
                    break;
                case 'interest':
                    $interestProfile = json_decode($assessment['responses'], true);
                    break;
                case 'personality':
                    $personalityProfile = json_decode($assessment['responses'], true);
                    break;
            }
        }

        // Also accept data directly from POST body (for cases where data isn't saved first)
        if (isset($data['aptitude_score']))
            $aptitudeScore = (float) $data['aptitude_score'];
        if (isset($data['interest_profile']))
            $interestProfile = $data['interest_profile'];
        if (isset($data['personality_profile']))
            $personalityProfile = $data['personality_profile'];

        // ============ RECOMMENDATION ENGINE ============
        // Fetch all active careers
        $careerStmt = $db->query("SELECT id, title, category, stream, description, salary_range, growth, skills, match_keywords FROM careers WHERE is_active = 1");
        $allCareers = $careerStmt->fetchAll();

        $recommendations = [];

        foreach ($allCareers as $career) {
            $score = calculateMatchScore($career, $aptitudeScore, $interestProfile, $personalityProfile);
            $recommendations[] = [
                'career_id' => (int) $career['id'],
                'title' => $career['title'],
                'category' => $career['category'],
                'stream' => $career['stream'],
                'match_percentage' => round($score, 1),
                'salary_range' => $career['salary_range'],
                'growth' => $career['growth']
            ];
        }

        // Sort by match percentage descending
        usort($recommendations, function ($a, $b) {
            return $b['match_percentage'] <=> $a['match_percentage'];
        });

        // Take top 10 recommendations
        $topRecommendations = array_slice($recommendations, 0, 10);

        // Generate strengths & areas to improve based on scores
        $strengths = analyzeStrengths($aptitudeScore, $interestProfile, $personalityProfile);
        $areasToImprove = analyzeWeaknesses($aptitudeScore, $interestProfile, $personalityProfile);

        $summary = generateSummary($aptitudeScore, $interestProfile, $personalityProfile, $topRecommendations);

        // Save report to database
        $reportStmt = $db->prepare("INSERT INTO reports (user_id, aptitude_score, interest_profile, personality_profile, recommended_careers, summary, strengths, areas_to_improve, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'generated')");
        $reportStmt->execute([
            $userId,
            $aptitudeScore,
            json_encode($interestProfile),
            json_encode($personalityProfile),
            json_encode($topRecommendations),
            $summary,
            json_encode($strengths),
            json_encode($areasToImprove)
        ]);

        $reportId = $db->lastInsertId();

        sendSuccess([
            'report_id' => (int) $reportId,
            'aptitude_score' => $aptitudeScore,
            'interest_profile' => $interestProfile,
            'personality_profile' => $personalityProfile,
            'recommended_careers' => $topRecommendations,
            'strengths' => $strengths,
            'areas_to_improve' => $areasToImprove,
            'summary' => $summary,
            'generated_at' => date('Y-m-d H:i:s')
        ], 'Report generated successfully', 201);

    } catch (PDOException $e) {
        sendError('Failed to generate report: ' . $e->getMessage(), 500);
    }
}

function handleListReports($db)
{
    $userId = $_SESSION['user_id'];
    $role = $_SESSION['user_role'];

    try {
        if ($role === 'student') {
            $stmt = $db->prepare("SELECT id, report_title, aptitude_score, status, generated_at, reviewed_at FROM reports WHERE user_id = ? ORDER BY generated_at DESC");
            $stmt->execute([$userId]);
        } elseif ($role === 'counsellor' || $role === 'admin') {
            // Counsellors and admins can see all reports
            $stmt = $db->prepare("SELECT r.id, r.report_title, r.aptitude_score, r.status, r.generated_at, r.reviewed_at, u.name as student_name, u.email as student_email FROM reports r JOIN users u ON r.user_id = u.id ORDER BY r.generated_at DESC");
            $stmt->execute();
        } else {
            sendError('Unauthorized', 403);
        }

        $reports = $stmt->fetchAll();
        sendSuccess($reports, 'Reports retrieved', 200);

    } catch (PDOException $e) {
        sendError('Failed to retrieve reports: ' . $e->getMessage(), 500);
    }
}

function handleGetReport($db)
{
    if (empty($_GET['id'])) {
        sendError('Report ID is required', 400);
    }

    $userId = $_SESSION['user_id'];
    $role = $_SESSION['user_role'];

    try {
        if ($role === 'student') {
            $stmt = $db->prepare("SELECT * FROM reports WHERE id = ? AND user_id = ?");
            $stmt->execute([$_GET['id'], $userId]);
        } else {
            // Admin/counsellor can see any report
            $stmt = $db->prepare("SELECT r.*, u.name as student_name, u.email as student_email FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?");
            $stmt->execute([$_GET['id']]);
        }

        $report = $stmt->fetch();
        if (!$report) {
            sendError('Report not found', 404);
        }

        // Parse JSON fields
        $report['interest_profile'] = json_decode($report['interest_profile'], true);
        $report['personality_profile'] = json_decode($report['personality_profile'], true);
        $report['recommended_careers'] = json_decode($report['recommended_careers'], true);
        $report['strengths'] = json_decode($report['strengths'], true);
        $report['areas_to_improve'] = json_decode($report['areas_to_improve'], true);

        sendSuccess($report, 'Report retrieved');

    } catch (PDOException $e) {
        sendError('Failed to retrieve report: ' . $e->getMessage(), 500);
    }
}

function handleReviewReport($db)
{
    if (empty($_GET['id'])) {
        sendError('Report ID is required', 400);
    }

    $counsellorId = $_SESSION['user_id'];

    try {
        $stmt = $db->prepare("UPDATE reports SET status = 'reviewed', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?");
        $stmt->execute([$counsellorId, $_GET['id']]);

        sendSuccess(null, 'Report marked as reviewed');

    } catch (PDOException $e) {
        sendError('Failed to review report: ' . $e->getMessage(), 500);
    }
}

// ======================== RECOMMENDATION ENGINE ========================

function calculateMatchScore($career, $aptitudeScore, $interestProfile, $personalityProfile)
{
    $score = 50; // Base score

    $keywords = json_decode($career['match_keywords'] ?? '[]', true) ?: [];
    $category = strtolower($career['category']);

    // Aptitude contribution (up to 20 points)
    if ($aptitudeScore !== null) {
        $score += ($aptitudeScore / 100) * 20;
    }

    // Interest profile contribution (up to 20 points)
    if (is_array($interestProfile)) {
        $interestMapping = [
            'technology' => ['investigative', 'realistic'],
            'healthcare' => ['social', 'investigative'],
            'business' => ['enterprising', 'conventional'],
            'creative' => ['artistic', 'social'],
            'education' => ['social', 'conventional'],
            'science' => ['investigative', 'realistic'],
            'law' => ['enterprising', 'investigative'],
            'government' => ['conventional', 'social'],
            'engineering' => ['realistic', 'investigative'],
            'design' => ['artistic', 'realistic']
        ];

        $relevantInterests = $interestMapping[$category] ?? ['investigative', 'realistic'];

        foreach ($interestProfile as $interest => $value) {
            if (in_array(strtolower($interest), $relevantInterests)) {
                $score += ((int) $value / 100) * 10;
            }
        }
    }

    // Personality contribution (up to 10 points)
    if (is_array($personalityProfile)) {
        $personalityMapping = [
            'technology' => ['openness' => 0.8, 'conscientiousness' => 0.7],
            'healthcare' => ['agreeableness' => 0.9, 'conscientiousness' => 0.8],
            'business' => ['extraversion' => 0.8, 'conscientiousness' => 0.7],
            'creative' => ['openness' => 0.9, 'extraversion' => 0.5],
            'education' => ['agreeableness' => 0.8, 'extraversion' => 0.7],
            'science' => ['openness' => 0.9, 'conscientiousness' => 0.8],
            'law' => ['conscientiousness' => 0.9, 'extraversion' => 0.6],
            'government' => ['conscientiousness' => 0.8, 'agreeableness' => 0.6],
            'engineering' => ['conscientiousness' => 0.8, 'openness' => 0.7],
            'design' => ['openness' => 0.9, 'agreeableness' => 0.5]
        ];

        $weights = $personalityMapping[$category] ?? ['openness' => 0.5, 'conscientiousness' => 0.5];

        foreach ($personalityProfile as $trait => $value) {
            $traitLower = strtolower($trait);
            if (isset($weights[$traitLower])) {
                $score += ((int) $value / 100) * $weights[$traitLower] * 10;
            }
        }
    }

    // Add some randomness to make it feel natural (±3%)
    $score += (mt_rand(-30, 30) / 10);

    return max(40, min(99, $score)); // Clamp between 40-99
}

function analyzeStrengths($aptitudeScore, $interestProfile, $personalityProfile)
{
    $strengths = [];

    if ($aptitudeScore !== null) {
        if ($aptitudeScore >= 80)
            $strengths[] = "Excellent analytical and problem-solving abilities";
        elseif ($aptitudeScore >= 60)
            $strengths[] = "Good logical reasoning skills";
    }

    if (is_array($personalityProfile)) {
        if (($personalityProfile['openness'] ?? 0) >= 70)
            $strengths[] = "High creativity and openness to new experiences";
        if (($personalityProfile['conscientiousness'] ?? 0) >= 70)
            $strengths[] = "Strong organizational and planning skills";
        if (($personalityProfile['extraversion'] ?? 0) >= 70)
            $strengths[] = "Excellent communication and leadership potential";
        if (($personalityProfile['agreeableness'] ?? 0) >= 70)
            $strengths[] = "Great teamwork and interpersonal skills";
    }

    if (is_array($interestProfile)) {
        $topInterests = array_keys(array_filter($interestProfile, function ($v) {
            return $v > 0; }));
        if (count($topInterests) >= 3)
            $strengths[] = "Diverse range of interests showing adaptability";
    }

    if (empty($strengths))
        $strengths[] = "Balanced personality profile suitable for multiple career paths";

    return $strengths;
}

function analyzeWeaknesses($aptitudeScore, $interestProfile, $personalityProfile)
{
    $areas = [];

    if ($aptitudeScore !== null && $aptitudeScore < 50) {
        $areas[] = "Consider strengthening analytical and problem-solving skills through practice";
    }

    if (is_array($personalityProfile)) {
        if (($personalityProfile['conscientiousness'] ?? 50) < 40)
            $areas[] = "Developing better organizational habits could support career growth";
        if (($personalityProfile['extraversion'] ?? 50) < 30)
            $areas[] = "Building confidence in networking and public speaking may open more opportunities";
    }

    if (empty($areas))
        $areas[] = "Continue developing skills in your area of interest for a competitive edge";

    return $areas;
}

function generateSummary($aptitudeScore, $interestProfile, $personalityProfile, $topRecommendations)
{
    $topCareer = !empty($topRecommendations) ? $topRecommendations[0]['title'] : 'various fields';
    $topMatch = !empty($topRecommendations) ? $topRecommendations[0]['match_percentage'] : 0;
    $topCategory = !empty($topRecommendations) ? $topRecommendations[0]['category'] : 'multiple areas';

    $summary = "Based on your comprehensive assessment results, ";

    if ($aptitudeScore !== null) {
        if ($aptitudeScore >= 80)
            $summary .= "you demonstrate strong analytical abilities. ";
        elseif ($aptitudeScore >= 60)
            $summary .= "you show solid aptitude across multiple areas. ";
        else
            $summary .= "your overall profile suggests good potential with room for growth. ";
    }

    $summary .= "Your top recommended career is $topCareer with a $topMatch% match score in the $topCategory field. ";
    $summary .= "We recommend exploring your top 3-5 career options in detail, including their educational requirements and growth potential.";

    return $summary;
}

// ======================== HELPERS ========================

function requireAuth()
{
    if (!isset($_SESSION['user_id'])) {
        sendError('Authentication required. Please login.', 401);
    }
}

function requireCounsellor()
{
    requireAuth();
    if (!in_array($_SESSION['user_role'], ['counsellor', 'admin'])) {
        sendError('Counsellor or admin access required', 403);
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