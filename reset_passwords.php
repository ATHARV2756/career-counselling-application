<?php
/**
 * Password Reset Script
 * Run this once in browser: http://localhost/career-compass/backend/reset_passwords.php
 * It will set simple passwords for all accounts.
 */

require_once 'config/database.php';

$database = new Database();
$db = $database->getConnection();

echo "<h2>🔑 Resetting Passwords...</h2>";

// New simple passwords for admins/counsellors
$adminPasswords = [
    ['email' => 'admin@careercompass.com', 'password' => 'admin1234', 'role' => 'Admin'],
    ['email' => 'sarah@careercompass.com', 'password' => 'sarah1234', 'role' => 'Counsellor (Sarah)'],
    ['email' => 'michael@careercompass.com', 'password' => 'michael1234', 'role' => 'Counsellor (Michael)'],
    ['email' => 'emily@careercompass.com', 'password' => 'emily1234', 'role' => 'Counsellor (Emily)'],
    ['email' => 'david@careercompass.com', 'password' => 'david1234', 'role' => 'Counsellor (David)'],
];

foreach ($adminPasswords as $user) {
    $hash = password_hash($user['password'], PASSWORD_BCRYPT);
    $stmt = $db->prepare("UPDATE admins SET password = ? WHERE email = ?");
    $stmt->execute([$hash, $user['email']]);
    echo "<p>✅ <strong>{$user['role']}</strong> — {$user['email']} → password: <code>{$user['password']}</code></p>";
}

// Also reset any student passwords (set them all to a simple one)
$studentHash = password_hash('student1234', PASSWORD_BCRYPT);
$stmt = $db->prepare("UPDATE users SET password = ?");
$stmt->execute([$studentHash]);
$count = $stmt->rowCount();
echo "<p>✅ <strong>All Students ($count)</strong> → password: <code>student1234</code></p>";

echo "<hr>";
echo "<h3>📋 Login Cheat Sheet</h3>";
echo "<table border='1' cellpadding='8' cellspacing='0' style='border-collapse:collapse; font-family:sans-serif;'>";
echo "<tr style='background:#7C3AED;color:white;'><th>Role</th><th>Email</th><th>Password</th><th>Extra Field</th></tr>";
echo "<tr><td>Admin</td><td>admin@careercompass.com</td><td><b>admin1234</b></td><td>Code: CC-ADMIN-2026</td></tr>";
echo "<tr><td>Counsellor</td><td>sarah@careercompass.com</td><td><b>sarah1234</b></td><td>ID: CC-1001</td></tr>";
echo "<tr><td>Counsellor</td><td>michael@careercompass.com</td><td><b>michael1234</b></td><td>ID: CC-1002</td></tr>";
echo "<tr><td>Counsellor</td><td>emily@careercompass.com</td><td><b>emily1234</b></td><td>ID: CC-1003</td></tr>";
echo "<tr><td>Counsellor</td><td>david@careercompass.com</td><td><b>david1234</b></td><td>ID: CC-1004</td></tr>";
echo "<tr><td>Student</td><td>(any registered student)</td><td><b>student1234</b></td><td>—</td></tr>";
echo "</table>";

echo "<br><p style='color:green;font-weight:bold;'>✅ All passwords reset! You can now login at <a href='../index.html'>Career Compass</a></p>";
echo "<p style='color:red;'>⚠️ Delete this file after use for security!</p>";
?>