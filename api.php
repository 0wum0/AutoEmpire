<?php
session_start();
header('Content-Type: application/json');

if (!file_exists('config.php') || !isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}
require_once 'config.php';
$pdo = getPDO();
$uid    = (int)$_SESSION['user_id'];
$action = $_GET['action'] ?? '';

// ── INIT ─────────────────────────────────────────────────────────────────────
if ($action === 'init') {

    // Try to fetch user row — graceful fallback if new columns don't exist yet
    $user = null;
    try {
        $stmt = $pdo->prepare("SELECT json_state, company_id, company_name, company_color, money FROM ae_users WHERE id=?");
        $stmt->execute([$uid]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // New columns (company_id etc) missing — run update.php! Fallback:
        try {
            $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
            $stmt->execute([$uid]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e2) {
            $user = null;
        }
    }

    // Decode saved game state
    $user_state = null;
    if ($user && !empty($user['json_state'])) {
        $user_state = json_decode($user['json_state'], true);
    }

    // KEY: inject company_id from DB column → persists even before first auto-save!
    $company_id = $user['company_id'] ?? null;
    if ($company_id) {
        if ($user_state === null) {
            $user_state = ['companyId' => $company_id];
        } elseif (empty($user_state['companyId'])) {
            $user_state['companyId'] = $company_id;
        }
    }

    // Multiplayer rivals
    $rivals = [];
    try {
        $stmt2 = $pdo->query("SELECT id, username, company_name as n, company_color as cl, money as ca, is_ai FROM ae_users WHERE id != $uid ORDER BY money DESC LIMIT 12");
        foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rivals[] = [
                'id'   => 'user_' . $r['id'],
                'n'    => $r['n'] ?: $r['username'],
                'cl'   => $r['cl'] ?: '#888888',
                'ca'   => (int)$r['ca'],
                'sh'   => round(rand(1, 12) + rand(0, 9) / 10, 1),
                'ag'   => !empty($r['is_ai']) ? 0.8 : 0.5,
                'isAI' => !empty($r['is_ai']),
                'ic'   => !empty($r['is_ai']) ? 'KI' : 'P',
            ];
        }
    } catch (PDOException $e) { /* rivals optional */ }

    // Leaderboard
    $leaderboard = [];
    try {
        $stmt3 = $pdo->query("SELECT id, username, company_name, money, is_ai FROM ae_users ORDER BY money DESC LIMIT 20");
        $pos = 1;
        foreach ($stmt3->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $leaderboard[] = [
                'name'    => $row['company_name'] ?: $row['username'],
                'company' => $row['username'],
                'score'   => (int)$row['money'],
                'isMe'    => (int)$row['id'] === $uid,
                'isAI'    => !empty($row['is_ai']),
                'rank'    => $pos++,
            ];
        }
    } catch (PDOException $e) { /* leaderboard optional */ }

    echo json_encode([
        'status'             => 'ok',
        'uid'                => $uid,
        'user_state'         => $user_state,
        'company_id'         => $company_id,   // also top-level for easy frontend check
        'multiplayer_rivals' => $rivals,
        'leaderboard'        => $leaderboard,
    ]);
    exit;
}

// ── SET COMPANY ───────────────────────────────────────────────────────────────
if ($action === 'set_company') {
    $body          = json_decode(file_get_contents('php://input'), true);
    $company_id    = $body['company_id']    ?? ($_GET['company_id'] ?? null);
    $company_name  = $body['company_name']  ?? ($_GET['company_name'] ?? null);
    $company_color = $body['company_color'] ?? ($_GET['company_color'] ?? '#00d4ff');
    if (!$company_id) { echo json_encode(['error' => 'No company_id']); exit; }

    // Ensure columns exist (graceful)
    try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS company_id VARCHAR(30) DEFAULT NULL"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS company_color VARCHAR(7) DEFAULT '#00d4ff'"); } catch(Exception $e){}

    $stmt = $pdo->prepare("UPDATE ae_users SET company_id=?, company_name=?, company_color=? WHERE id=?");
    $stmt->execute([$company_id, $company_name, $company_color, $uid]);
    echo json_encode(['status' => 'company_set', 'company_id' => $company_id]);
    exit;
}

// ── SAVE ──────────────────────────────────────────────────────────────────────
if ($action === 'save') {
    $data    = file_get_contents('php://input');
    $decoded = json_decode($data, true);
    $money   = isset($decoded['money'])      ? (int)$decoded['money']       : null;
    $share   = isset($decoded['share'])      ? (float)$decoded['share']     : null;
    $stock   = isset($decoded['stockPrice']) ? (float)$decoded['stockPrice']: null;

    try {
        $stmt = $pdo->prepare("UPDATE ae_users SET json_state=?, last_update=NOW(), money=COALESCE(?,money), market_share=COALESCE(?,market_share), stock_price=COALESCE(?,stock_price) WHERE id=?");
        $stmt->execute([$data, $money, $share, $stock, $uid]);
    } catch (PDOException $e) {
        // Fallback without optional columns
        $stmt = $pdo->prepare("UPDATE ae_users SET json_state=?, last_update=NOW() WHERE id=?");
        $stmt->execute([$data, $uid]);
    }
    echo json_encode(['status' => 'saved']);
    exit;
}

echo json_encode(['error' => 'Unknown action']);
