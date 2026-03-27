<?php
session_start();
header('Content-Type: application/json');

if (!file_exists('config.php') || !isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}
require_once 'config.php';
$pdo = getPDO();
$uid = $_SESSION['user_id'];
$action = $_GET['action'] ?? '';

if ($action === 'init') {
    // 1. Fetch game config from DB to completely override static JS arrays!
    $stmt = $pdo->query("SELECT category, raw_js FROM ae_game_configs");
    $configs = [];
    while ($row = $stmt->fetch()) {
        $configs[$row['category']] = $row['raw_js'];
    }
    
    // 2. Fetch user state
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$uid]);
    $state = $stmt->fetchColumn();
    
    // 3. Fetch Multiplayer Rivals (other players) for the Stock Market / M&A!
    $stmt2 = $pdo->prepare("SELECT id, company_name as n, color as cl, money as ca FROM ae_users WHERE id != ? LIMIT 10");
    $stmt2->execute([$uid]);
    $rivals = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    foreach($rivals as &$r) {
        $r['ic'] = '👤';
        $r['sh'] = rand(1, 15); // simulate market share or calculate real
        $r['ag'] = 0.5;
        // Transform id to a string format expected by JS if needed, or keep int
        $r['id'] = 'user_' . $r['id'];
    }

    echo json_encode([
        'status' => 'ok',
        'configs' => $configs,
        'user_state' => $state ? json_decode($state, true) : null,
        'multiplayer_rivals' => $rivals
    ]);
    exit;
}

if ($action === 'save') {
    $data = file_get_contents('php://input');
    // Save state string directly to DB to persist their localStorage format
    $stmt = $pdo->prepare("UPDATE ae_users SET json_state=?, last_update=NOW() WHERE id=?");
    $stmt->execute([$data, $uid]);
    echo json_encode(['status' => 'saved']);
    exit;
}

echo json_encode(['error' => 'Unknown action']);
