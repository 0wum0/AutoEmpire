<?php
session_start();
header('Content-Type: application/json');

if (!file_exists('config.php') || !isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Not authenticated']);
    exit;
}
require_once 'config.php';
$pdo = getPDO();
$uid    = $_SESSION['user_id'];
$action = $_GET['action'] ?? '';

// ── INIT ─────────────────────────────────────────────────────────────────────
if ($action === 'init') {
    // User state
    $stmt = $pdo->prepare("SELECT json_state, company_id, company_name, company_color, money, esg_score, stock_price, market_share FROM ae_users WHERE id=?");
    $stmt->execute([$uid]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    $user_state = null;
    if ($user['json_state']) {
        $user_state = json_decode($user['json_state'], true);
        // Ensure companyId is always in state (for persistence check)
        if ($user['company_id'] && !isset($user_state['companyId'])) {
            $user_state['companyId'] = $user['company_id'];
        }
    }

    // Real multiplayer rivals (real players + AI bots)
    $stmt2 = $pdo->query("SELECT id, username, company_name as n, company_color as cl, money as ca, market_share as sh, is_ai FROM ae_users WHERE id != $uid ORDER BY money DESC LIMIT 12");
    $rivals = [];
    foreach ($stmt2->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $rivals[] = [
            'id'    => 'user_' . $r['id'],
            'n'     => $r['n'] ?: $r['username'],
            'cl'    => $r['cl'] ?: '#888888',
            'ca'    => (int)$r['ca'],
            'sh'    => (float)($r['sh'] ?: rand(1, 12)),
            'ag'    => $r['is_ai'] ? 0.8 : 0.5,
            'isAI'  => (bool)$r['is_ai'],
            'ic'    => $r['is_ai'] ? '🤖' : '👤',
        ];
    }

    // Global leaderboard (top 20)
    $stmt3 = $pdo->query("SELECT u.id, u.username, u.company_name, u.money, u.is_ai FROM ae_users u ORDER BY u.money DESC LIMIT 20");
    $leaderboard = [];
    $pos = 1;
    foreach ($stmt3->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $leaderboard[] = [
            'name'    => $row['company_name'] ?: $row['username'],
            'company' => $row['username'],
            'score'   => (int)$row['money'],
            'isMe'    => (int)$row['id'] === (int)$uid,
            'isAI'    => (bool)$row['is_ai'],
            'rank'    => $pos++,
        ];
    }

    echo json_encode([
        'status'            => 'ok',
        'user_state'        => $user_state,
        'multiplayer_rivals'=> $rivals,
        'leaderboard'       => $leaderboard,
    ]);
    exit;
}

// ── SET COMPANY (persist company choice after selection) ──────────────────────
if ($action === 'set_company') {
    $body = json_decode(file_get_contents('php://input'), true);
    $company_id    = $body['company_id']    ?? null;
    $company_name  = $body['company_name']  ?? null;
    $company_color = $body['company_color'] ?? '#00d4ff';

    if (!$company_id) {
        echo json_encode(['error' => 'No company_id provided']);
        exit;
    }

    $stmt = $pdo->prepare("UPDATE ae_users SET company_id=?, company_name=?, company_color=? WHERE id=?");
    $stmt->execute([$company_id, $company_name, $company_color, $uid]);
    echo json_encode(['status' => 'company_set']);
    exit;
}

// ── SAVE ──────────────────────────────────────────────────────────────────────
if ($action === 'save') {
    $data    = file_get_contents('php://input');
    $decoded = json_decode($data, true);

    // Update money and market share in user row for leaderboard/rivals
    $money  = isset($decoded['money'])  ? (int)$decoded['money']  : null;
    $share  = isset($decoded['share'])  ? (float)$decoded['share'] : null;
    $stock  = isset($decoded['stockPrice']) ? (float)$decoded['stockPrice'] : null;

    $stmt = $pdo->prepare("UPDATE ae_users SET json_state=?, last_update=NOW(), money=COALESCE(?,money), market_share=COALESCE(?,market_share), stock_price=COALESCE(?,stock_price) WHERE id=?");
    $stmt->execute([$data, $money, $share, $stock, $uid]);
    echo json_encode(['status' => 'saved']);
    exit;
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
if ($action === 'leaderboard') {
    $stmt = $pdo->query("SELECT id, username, company_name, money, is_ai FROM ae_users ORDER BY money DESC LIMIT 50");
    $rows = [];
    $pos = 1;
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $rows[] = [
            'rank'    => $pos++,
            'name'    => $row['company_name'] ?: $row['username'],
            'user'    => $row['username'],
            'score'   => (int)$row['money'],
            'isMe'    => (int)$row['id'] === (int)$uid,
            'isAI'    => (bool)$row['is_ai'],
        ];
    }
    echo json_encode(['status' => 'ok', 'leaderboard' => $rows]);
    exit;
}

echo json_encode(['error' => 'Unknown action']);
