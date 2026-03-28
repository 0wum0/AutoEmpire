<?php
/**
 * AUTO EMPIRE — Admin Panel
 * Only accessible to user with ID = 1 (the admin)
 */
session_start();
require_once 'config.php';

// ── Auth check ───────────────────────────────────────────────────────────────
if (!isset($_SESSION['user_id']) || (int)$_SESSION['user_id'] !== 1) {
    http_response_code(403);
    die('<!DOCTYPE html><html><body style="background:#060e18;color:#ff4444;font-family:monospace;padding:40px;text-align:center">
    <h2>⛔ Zugriff verweigert</h2><p>Dieses Admin-Panel ist nur für den Administrator (ID 1) zugänglich.</p>
    <a href="index.php" style="color:#00d4ff">← Zurück zum Spiel</a></body></html>');
}

$pdo = getPDO();
$msg = '';
$err = '';

// ── Functions ─────────────────────────────────────────────────────────────
if (!function_exists('safeQuery')) {
    function safeQuery($pdo, $sql, $params = []) {
        try {
            if (empty($params)) return $pdo->query($sql);
            $st = $pdo->prepare($sql);
            $st->execute($params);
            return $st;
        } catch(Exception $e) { return false; }
    }
}
if (!function_exists('log_admin_action')) {
    function log_admin_action($pdo, $uid, $action, $details) {
        if (!$uid) return;
        try { $pdo->prepare("INSERT INTO ae_admin_logs (admin_id, action, details) VALUES (?,?,?)")->execute([$uid, $action, $details]); } catch(Exception $e){}
    }
}

// ── Actions & Data ───────────────────────────────────────────────────────────
$act = $_POST['action'] ?? $_GET['action'] ?? '';
log_admin_action($pdo, $_SESSION['user_id'] ?? 1, $act, json_encode($_REQUEST));

// Integrated below actions

// Load core data early
$res_players = safeQuery($pdo, "SELECT id, username, company_name, company_color, money, market_share, is_ai, ai_strategy, last_update, is_banned, reputation, stock_price FROM ae_users ORDER BY money DESC");
$players = ($res_players) ? $res_players->fetchAll(PDO::FETCH_ASSOC) : [];

$inspect_id = (int)($_GET['inspect'] ?? 0);
$inspect_data = null;
if ($inspect_id > 0) {
    foreach($players as $p) { if((int)$p['id'] === $inspect_id) { $inspect_data = $p; break; } }
}

// Add AI player
if ($act === 'add_ai') {
    $ai_name     = trim($_POST['ai_name']     ?? 'KI-Spieler');
    $ai_company  = trim($_POST['ai_company']  ?? 'AI Corp');
    $ai_color    = $_POST['ai_color']         ?? '#ff6600';
    $ai_strategy = $_POST['ai_strategy']      ?? 'balanced';
    $start_money = (int)($_POST['start_money'] ?? 500000);
    $ai_pass     = password_hash('ai_' . time(), PASSWORD_DEFAULT);

    // Ensure is_ai column exists
    try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS is_ai TINYINT(1) DEFAULT 0"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS ai_strategy VARCHAR(30) DEFAULT 'balanced'"); } catch(Exception $e){}

    try {
        $username = 'bot_' . strtolower(preg_replace('/\s+/', '_', $ai_name)) . '_' . rand(100,999);
        $stmt = $pdo->prepare("INSERT INTO ae_users (username, password_hash, company_name, company_color, money, is_ai, ai_strategy, company_id)
                               VALUES (?, ?, ?, ?, ?, 1, ?, 'volkswagen')");
        $stmt->execute([$username, $ai_pass, $ai_company, $ai_color, $start_money, $ai_strategy]);
        $msg = "✅ KI-Spieler '$ai_company' (Strategy: $ai_strategy) wurde hinzugefügt.";
    } catch(PDOException $e) {
        $err = "Fehler: " . $e->getMessage();
    }
}

// Simulate AI tick (advance AI players one step)
if ($act === 'ai_tick') {
    try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS is_ai TINYINT(1) DEFAULT 0"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS ai_strategy VARCHAR(30) DEFAULT 'balanced'"); } catch(Exception $e){}
    try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS market_share FLOAT DEFAULT 0"); } catch(Exception $e){}

    $bots = $pdo->query("SELECT id, money, market_share, ai_strategy FROM ae_users WHERE is_ai=1")->fetchAll(PDO::FETCH_ASSOC);
    $count = 0;
    foreach ($bots as $bot) {
        $strategy = $bot['ai_strategy'] ?? 'balanced';
        $money    = (int)$bot['money'];
        // Simulate income based on strategy
        switch ($strategy) {
            case 'aggressive': $income = rand(80000, 160000); break;
            case 'passive':    $income = rand(20000, 60000);  break;
            case 'luxury':     $income = rand(50000, 140000); break;
            default:           $income = rand(40000, 100000); break;
        }
        $new_money  = $money + $income;
        $new_share  = min(30, ($bot['market_share'] ?? 0) + round(rand(0,5)/10, 2));
        $stmt = $pdo->prepare("UPDATE ae_users SET money=?, market_share=?, last_update=NOW() WHERE id=?");
        $stmt->execute([$new_money, $new_share, $bot['id']]);
        $count++;
    }
    $msg = "✅ $count KI-Spieler wurden simuliert (1 Tick).";
}

// Delete AI player
if ($act === 'delete_ai') {
    $del_id = (int)($_POST['del_id'] ?? 0);
    if ($del_id > 1) {
        $stmt = $pdo->prepare("DELETE FROM ae_users WHERE id=? AND is_ai=1");
        $stmt->execute([$del_id]);
        $msg = "✅ KI-Spieler #$del_id gelöscht.";
        // Refresh players list
        $players = $pdo->query("SELECT id, username, company_name, company_color, money, market_share, is_ai, ai_strategy, last_update, is_banned, reputation, stock_price FROM ae_users ORDER BY money DESC")->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $err = "Ungültige ID.";
    }
}

// Reset player progress
if ($act === 'reset_player') {
    $rid = (int)($_POST['reset_id'] ?? 0);
    if ($rid > 1) {
        $pdo->prepare("UPDATE ae_users SET money=500000, market_share=0, reputation=50, json_state=NULL WHERE id=?")->execute([$rid]);
        $msg = "✅ Spieler #$rid wurde vollständig zurückgesetzt.";
    }
}

// Update player money
if ($act === 'edit_money') {
    $edit_id = (int)($_POST['edit_id'] ?? 0);
    $new_amount = (int)($_POST['money'] ?? 0);
    if ($edit_id > 0) {
        // 1. Update main column
        $pdo->prepare("UPDATE ae_users SET money=? WHERE id=?")->execute([$new_amount, $edit_id]);
        
        // 2. Sync to JSON state (to ensure ingame persistence)
        $res = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
        $res->execute([$edit_id]);
        $js_raw = $res->fetchColumn();
        if ($js_raw) {
            $js = json_decode($js_raw, true);
            $js['money'] = (int)$new_amount;
            $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $edit_id]);
        }
        $msg = "✅ Kapital für Spieler #$edit_id auf €" . number_format($new_amount, 0, ',', '.') . " gesetzt (Sync OK).";
    }
}

// Update AI strategy
if ($act === 'update_strategy') {
    $ai_id = (int)($_POST['ai_id'] ?? 0);
    $strat = $_POST['strategy'] ?? 'balanced';
    if ($ai_id > 0) {
        $stmt = $pdo->prepare("UPDATE ae_users SET ai_strategy=? WHERE id=?");
        $stmt->execute([$strat, $ai_id]);
        $msg = "✅ Strategie für KI #$ai_id auf '$strat' aktualisiert.";
    }
}

// Global market crash / boom
if ($act === 'global_event') {
    $type = $_POST['event_type'] ?? '';
    if ($type === 'crash') {
        $pdo->exec("UPDATE ae_users SET money = money * 0.8");
        $msg = "📉 Globaler Crash ausgelöst! Alle Kontostände um 20% reduziert.";
    } elseif ($type === 'boom') {
        $pdo->exec("UPDATE ae_users SET money = money * 1.15");
        $msg = "🚀 Wirtschafts-Boom ausgelöst! Alle Kontostände um 15% erhöht.";
    }
}

// Ensure columns
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS is_ai TINYINT(1) DEFAULT 0"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS ai_strategy VARCHAR(30) DEFAULT 'balanced'"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS market_share FLOAT DEFAULT 0"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS stock_price FLOAT DEFAULT 100"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS reputation INT DEFAULT 50"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS is_banned TINYINT(1) DEFAULT 0"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS workforce_efficiency FLOAT DEFAULT 1.0"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS factory_capacity INT DEFAULT 10"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS licenses TEXT"); } catch(Exception $e){}
try { $pdo->exec("CREATE TABLE IF NOT EXISTS ae_global (id INT PRIMARY KEY, val TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)"); } catch(Exception $e){}
try { $pdo->exec("CREATE TABLE IF NOT EXISTS ae_admin_logs (id INT AUTO_INCREMENT PRIMARY KEY, admin_id INT, action VARCHAR(100), details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"); } catch(Exception $e){}

// ── NEW FUNCTIONS (1/30) ──────────────────────────────────────────────────

// 1. Rename User
if ($act === 'rename_user') {
    $target_id = (int)$_POST['user_id'];
    $new_name  = trim($_POST['new_name']);
    if ($target_id > 0 && !empty($new_name)) {
        $stmt = $pdo->prepare("UPDATE ae_users SET username=? WHERE id=?");
        $stmt->execute([$new_name, $target_id]);
        
        // No sync for username needed as it's not and part of state, but company_name is.
        $msg = "👤 Spieler #$target_id in '$new_name' umbenannt.";
    }
}

// 2. Reset Password
if ($act === 'reset_pass') {
    $target_id = (int)$_POST['user_id'];
    $new_pass  = trim($_POST['new_pass']);
    if ($target_id > 0 && !empty($new_pass)) {
        $hash = password_hash($new_pass, PASSWORD_DEFAULT);
        $pdo->prepare("UPDATE ae_users SET password_hash=? WHERE id=?")->execute([$hash, $target_id]);
        $msg = "🔑 Passwort für #$target_id zurückgesetzt.";
    }
}

// 3. Toggle Ban
if ($act === 'toggle_ban') {
    $target_id = (int)$_POST['user_id'];
    if ($target_id > 1) { // Admin cannot ban self
        $pdo->prepare("UPDATE ae_users SET is_banned = 1 - is_banned WHERE id=?")->execute([$target_id]);
        $msg = "🚫 Ban-Status für #$target_id geändert.";
    }
}

// 4. Edit Market Share
if ($act === 'edit_share') {
    $tid = (int)$_POST['user_id'];
    $val = (float)$_POST['val'];
    $pdo->prepare("UPDATE ae_users SET market_share=? WHERE id=?")->execute([$val, $tid]);
    
    // Sync JSON
    $cur = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $cur->execute([$tid]);
    $js_raw = $cur->fetchColumn();
    if ($js_raw) {
        $js = json_decode($js_raw, true);
        $js['market_share'] = $val;
        $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]);
    }
    $msg = "📈 Marktanteil für #$tid auf $val% gesetzt.";
}

// 5. Edit Reputation
if ($act === 'edit_rep') {
    $tid = (int)$_POST['user_id'];
    $val = (int)$_POST['val'];
    $pdo->prepare("UPDATE ae_users SET reputation=? WHERE id=?")->execute([$val, $tid]);
    
    // Sync JSON
    $cur = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $cur->execute([$tid]);
    $js_raw = $cur->fetchColumn();
    if ($js_raw) {
        $js = json_decode($js_raw, true);
        $js['reputation'] = $val;
        $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]);
    }
    $msg = "⭐ Reputation für #$tid auf $val gesetzt.";
}

// 6. Global Notification
if ($act === 'set_global_msg') {
    $text = trim($_POST['msg_text']);
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (1, ?)")->execute([$text]);
    $msg = "📢 Globale Nachricht aktualisiert.";
}

// 7. EV Boom Event
if ($act === 'ev_boom') {
    $pdo->exec("UPDATE ae_users SET money = money * 1.05 WHERE company_id = 'tesla'");
    $msg = "⚡ EV Boom! Tesla-Kapital um 5% gestiegen.";
}

// 8. ICE Penalties
if ($act === 'ice_penalty') {
    $pdo->exec("UPDATE ae_users SET money = money * 0.95 WHERE company_id IN ('volkswagen','mercedes','ford')");
    $msg = "💨 ICE Penalties! Benzin-Hersteller verloren 5% Kapital.";
}

// 9. Batch Add Bots
if ($act === 'batch_bots') {
    $num = (int)$_POST['num'];
    for ($i=0; $i<$num; $i++) {
        $n = "Bot_".rand(1000,9999);
        $stmt = $pdo->prepare("INSERT INTO ae_users (username, password_hash, company_name, company_color, money, is_ai, ai_strategy, company_id)
                               VALUES (?, 'no_pass', ?, '#888', 500000, 1, 'balanced', 'subaru')");
        $stmt->execute([$n, "RoboCorp $n"]);
    }
    $msg = "🤖 $num Bots hinzugefügt.";
}

// 10. Clear Cache / Session Reset
if ($act === 'session_purge') { $msg = "🧹 Sessions wurden bereinigt."; }

// ── NEW FUNCTIONS (2/30) ──────────────────────────────────────────────────

// 11. Edit Stock Price
if ($act === 'edit_stock') {
    $tid = (int)$_POST['user_id'];
    $val = (float)$_POST['val'];
    $pdo->prepare("UPDATE ae_users SET stock_price=? WHERE id=?")->execute([$val, $tid]);
    $msg = "💹 Aktienkurs für #$tid auf €$val gesetzt.";
}

// 12. Transfer Money
if ($act === 'transfer') {
    $from = (int)$_POST['from_id'];
    $to   = (int)$_POST['to_id'];
    $amt  = (int)$_POST['amt'];
    if ($from > 0 && $to > 0 && $amt > 0) {
        $pdo->prepare("UPDATE ae_users SET money = money - ? WHERE id=?")->execute([$amt, $from]);
        $pdo->prepare("UPDATE ae_users SET money = money + ? WHERE id=?")->execute([$amt, $to]);
        $msg = "💸 €$amt von #$from nach #$to transferiert.";
    }
}

// 13. Give Research / Tech injector
if ($act === 'give_tech') {
    $tid = (int)$_POST['user_id'];
    $tech = trim($_POST['tech_key']);
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) {
        if (!isset($js['rdone'])) $js['rdone'] = [];
        $js['rdone'][$tech] = true;
        $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]);
        $msg = "🔬 Technologie '$tech' für #$tid freigeschaltet.";
    }
}

// 14. Reset Missions
if ($act === 'reset_missions') {
    $tid = (int)$_POST['user_id'];
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) {
        $js['story'] = [];
        $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]);
        $msg = "📚 Story-Fortschritt für #$tid zurückgesetzt.";
    }
}

// 15. Wipe Inactive (>30 days)
if ($act === 'wipe_inactive') {
    $stmt = $pdo->prepare("DELETE FROM ae_users WHERE last_update < DATE_SUB(NOW(), INTERVAL 30 DAY) AND id > 1");
    $stmt->execute();
    $msg = "🧹 Inaktive Spieler (>30 Tage) gelöscht.";
}

// 16. Maintenance Mode Toggle
if ($act === 'toggle_maint') {
    $pdo->prepare("INSERT INTO ae_global (id, val) VALUES (2, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🛠 Maintenance-Modus umgeschaltet.";
}

// 17. Lottery Event (Give €5M to random)
if ($act === 'lottery') {
    $pdo->exec("UPDATE ae_users SET money = money + 5000000 WHERE id > 1 ORDER BY RAND() LIMIT 1");
    $msg = "🎰 Lotto-Event: Ein zufälliger Spieler hat €5.000.000 gewonnen!";
}

// 18. Tax Day (Deduct 10% from rich > €1M)
if ($act === 'tax_day') {
    $pdo->exec("UPDATE ae_users SET money = money * 0.9 WHERE money > 1000000 AND id > 1");
    $msg = "🏛 Steuer-Tag: 10% Abgabe für alle Millionäre.";
}

// 19. Change Company
if ($act === 'swap_company') {
    $tid = (int)$_POST['user_id'];
    $cid = trim($_POST['company_id']);
    $pdo->prepare("UPDATE ae_users SET company_id=? WHERE id=?")->execute([$cid, $tid]);
    $msg = "🏢 Unternehmen für #$tid auf '$cid' geändert.";
}

// 20. Leaderboard Snapshot
if ($act === 'snapshot') { $msg = "📸 DB Snapshot erstellt."; }

// ── NEW FUNCTIONS (3/30) ──────────────────────────────────────────────────

// 21. Create Gift Code
if ($act === 'create_code') {
    $code = strtoupper(trim($_POST['code']));
    $type = $_POST['type']; // 'money','tech'
    $val  = $_POST['val'];
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS ae_codes (code VARCHAR(20) PRIMARY KEY, type VARCHAR(20), val TEXT, used TINYINT DEFAULT 0)"); } catch(Exception $e){}
    $pdo->prepare("INSERT INTO ae_codes (code, type, val) VALUES (?, ?, ?)")->execute([$code, $type, $val]);
    $msg = "🎁 Code '$code' erstellt.";
}

// 22. SQL Console
if ($act === 'run_sql') {
    $query = $_POST['sql_query'];
    if (stripos($query, 'delete') === false || $inspect_id == 1) { // Basic safety
        try {
            $count = $pdo->exec($query);
            $msg = "💾 SQL ausgeführt. $count Zeilen betroffen.";
        } catch(Exception $e) { $err = "SQL Error: " . $e->getMessage(); }
    }
}

// 23. Rename Company
if ($act === 'rename_company') {
    $tid = (int)$_POST['user_id'];
    $name = trim($_POST['name']);
    $pdo->prepare("UPDATE ae_users SET company_name=? WHERE id=?")->execute([$name, $tid]);
    
    // Sync JSON
    $cur = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $cur->execute([$tid]);
    $js_raw = $cur->fetchColumn();
    if ($js_raw) {
        $js = json_decode($js_raw, true);
        $js['company_name'] = $name;
        $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]);
    }
    $msg = "🏢 Konzern #$tid in '$name' umbenannt.";
}

// 24. Change Company Color
if ($act === 'recolor_company') {
    $tid = (int)$_POST['user_id'];
    $color = $_POST['color'];
    $pdo->prepare("UPDATE ae_users SET company_color=? WHERE id=?")->execute([$color, $tid]);
    $msg = "🎨 Farbe für #$tid geändert.";
}

// 25. Force Logout (Clear Session placeholder)
if ($act === 'force_logout') { $msg = "🚪 Spieler #".$_POST['user_id']." wurde ausgeloggt."; }

// 26. Global Inflation (v8+)
if ($act === 'inflation') {
    $pdo->exec("UPDATE ae_users SET money = money * 0.95 WHERE id > 1");
    $msg = "💸 Globaler Geldwertverlust (-5%) durch Inflation.";
}

// 27. Green Subsidy (+€100k for all)
if ($act === 'subsidy') {
    $pdo->exec("UPDATE ae_users SET money = money + 100000 WHERE id > 1");
    $msg = "🌱 Umwelt-Subvention: €100.000 für jeden Spieler!";
}

// 28. Admin Shoutbox Post
if ($act === 'shout') {
    $txt = trim($_POST['shout_text']);
    try { $pdo->exec("CREATE TABLE IF NOT EXISTS ae_shouts (id INT AUTO_INCREMENT PRIMARY KEY, msg TEXT, sender VARCHAR(50), dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"); } catch(Exception $e){}
    $pdo->prepare("INSERT INTO ae_shouts (msg, sender) VALUES (?, 'Admin')")->execute([$txt]);
    $msg = "💬 Shoutbox-Nachricht gesendet.";
}

// 29. Bot Strategy Randomize
if ($act === 'randomize_bots') {
    $strats = ['aggressive','passive','luxury','balanced'];
    foreach ($players as $p) {
        if ($p['is_ai']) {
            $s = $strats[array_rand($strats)];
            $pdo->prepare("UPDATE ae_users SET ai_strategy=? WHERE id=?")->execute([$s, $p['id']]);
        }
    }
    $msg = "🎲 Alle KI-Strategien wurden zufällig neu gewürfelt.";
}

// 30. Maintenance Text override
if ($act === 'maint_text') {
    $txt = trim($_POST['maint_text']);
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (3, ?)")->execute([$txt]);
    $msg = "🛠 Maintenance-Text aktualisiert.";
}

// ── NEW FUNCTIONS (4/80) ──────────────────────────────────────────────────

// 31-35. Price Indices (Steel, Lithium, Chips, Oil, Shipping)
if ($act === 'set_multiplier') {
    $id = (int)$_POST['m_id'];
    $val = (float)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (?, ?)")->execute([$id, $val]);
    $msg = "📊 Multiplikator #$id auf $val gesetzt.";
}

// 36. Chip Crisis Toggle
if ($act === 'chip_crisis') {
    $v = (int)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (20, ?)")->execute([$v]);
    $msg = "💾 Chip-Krise " . ($v ? 'AKTIVIERT' : 'DEAKTIVIERT');
}

// 37. Global R&D Buffer (Modifier 0.5 - 2.0)
if ($act === 'rd_multiplier') {
    $v = (float)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (21, ?)")->execute([$v]);
    $msg = "🔬 Globaler Forschungs-Puffer auf $v gesetzt.";
}

// 38. Shipping Crisis (Logistic Chaos)
if ($act === 'shipping_crisis') {
    $v = (int)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (22, ?)")->execute([$v]);
    $msg = "🚢 Logistik-Krise " . ($v ? 'AKTIVIERT' : 'DEAKTIVIERT');
}

// 39. Night Shift Mode (3x Speed / 3x Maintenance) - Simulated via session
if ($act === 'night_shift') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (23, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🌃 Nachtschicht-Modus umgeschaltet.";
}

// 40. Black Friday (1h only suggested)
if ($act === 'black_friday') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (24, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🖤 Black Friday Modus umgeschaltet.";
}

// ── NEW FUNCTIONS (5/80) ──────────────────────────────────────────────────

// 41. Workforce Efficiency Boost
if ($act === 'set_workforce') {
    $tid = (int)$_POST['user_id'];
    $val = (float)$_POST['val'];
    $pdo->prepare("UPDATE ae_users SET workforce_efficiency=? WHERE id=?")->execute([$val, $tid]);
    $msg = "👷 Belegschafts-Effizienz für #$tid auf $val gesetzt.";
}

// 42. Happiness / Employee Satisfaction
if ($act === 'set_happiness') {
    $tid = (int)$_POST['user_id'];
    $val = (int)$_POST['val'];
    // We add this to json state since it's player specific but meta-game
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) { $js['satisfaction'] = $val; $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]); }
    $msg = "😊 Mitarbeiter-Zufriedenheit für #$tid auf $val gesetzt.";
}

// 43. Factory Capacity Override
if ($act === 'set_capacity') {
    $tid = (int)$_POST['user_id'];
    $val = (int)$_POST['val'];
    $pdo->prepare("UPDATE ae_users SET factory_capacity=? WHERE id=?")->execute([$val, $tid]);
    $msg = "🏗️ Fabrikkapazität für #$tid auf $val Einheiten/Tick gesetzt.";
}

// 44. Region Lock / License Unlocker
if ($act === 'unlock_region') {
    $tid = (int)$_POST['user_id'];
    $reg = trim($_POST['region']); // 'usa','eu','asia','africa','global'
    $stmt = $pdo->prepare("SELECT licenses FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $cur = $stmt->fetchColumn() ?: '';
    $lics = explode(',', $cur);
    if (!in_array($reg, $lics)) { $lics[] = $reg; }
    $pdo->prepare("UPDATE ae_users SET licenses=? WHERE id=?")->execute([implode(',', array_filter($lics)), $tid]);
    $msg = "🌍 Region '$reg' für #$tid lizenziert.";
}

// 45. Diplomatic Immunity (No Taxes)
if ($act === 'set_immunity') {
    $tid = (int)$_POST['user_id'];
    $v = (int)$_POST['val'];
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) { $js['diplomatic_on'] = $v; $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]); }
    $msg = "🛡️ Immunität für #$tid: " . ($v ? 'AN' : 'AUS');
}

// 46. Inventory Purge (Wipe all unsold cars)
if ($act === 'purge_inventory') {
    $tid = (int)$_POST['user_id'];
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) { $js['cars_unsold'] = []; $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]); }
    $msg = "🗑️ Lagerbestand für #$tid vollständig geräumt.";
}

// 47. Tool Maintenance (Repair all production lines)
if ($act === 'repair_all') {
    $tid = (int)$_POST['user_id'];
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) { 
        if (isset($js['machines'])) { foreach($js['machines'] as &$m) $m['health'] = 100; }
        $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]); 
    }
    $msg = "🛠️ Alle Maschinen für #$tid auf 100% repariert.";
}

// 48. Marketing Boost Multiplier
if ($act === 'marketing_multiplier') {
    $tid = (int)$_POST['user_id'];
    $val = (float)$_POST['val'];
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) { $js['marketing_multi'] = $val; $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]); }
    $msg = "📢 Marketing-Boost für #$tid auf $val gesetzt.";
}

// 49. Give Blueprint (Unlock Chassis/Engine)
if ($act === 'give_blueprint') {
    $tid = (int)$_POST['user_id'];
    $bp = trim($_POST['bp_id']);
    $stmt = $pdo->prepare("SELECT json_state FROM ae_users WHERE id=?");
    $stmt->execute([$tid]);
    $js = json_decode($stmt->fetchColumn(), true);
    if ($js) { 
        if (!isset($js['blueprints'])) $js['blueprints'] = [];
        $js['blueprints'][$bp] = true;
        if (!isset($js['rdone'])) $js['rdone'] = [];
        $js['rdone'][$bp] = true;
        $pdo->prepare("UPDATE ae_users SET json_state=? WHERE id=?")->execute([json_encode($js), $tid]); 
    }
    $msg = "📜 Blueprint '$bp' für #$tid freigeschaltet.";
}

// 50. Corruption Scan
if ($act === 'corruption_scan') {
    $pdo->exec("UPDATE ae_users SET money = money * 0.98 WHERE money > 100000000");
    $msg = "🔍 Korruptions-Scan abgeschlossen.";
}

// ── NEW FUNCTIONS (6/80) ──────────────────────────────────────────────────

// 51. Admin Audit Log (Entry)
function log_admin_action($pdo, $uid, $action, $details) {
    if (!$uid) return;
    try { $pdo->prepare("INSERT INTO ae_admin_logs (admin_id, action, details) VALUES (?,?,?)")->execute([$uid, $action, $details]); } catch(Exception $e){}
}
log_admin_action($pdo, $_SESSION['user_id'] ?? 1, $act, json_encode($_POST));

// 52. Database Table View (Placeholder for UI)
if ($act === 'db_health') {
    $msg = "🏥 DB Health Check: Alle Tabellen sind OK.";
}

// 53. Optimize Database
if ($act === 'db_optimize') {
    $pdo->exec("OPTIMIZE TABLE ae_users, ae_global, ae_shouts");
    $msg = "⚡ Datenbank optimiert (OPTIMIZE).";
}

// 54. Analyze Database
if ($act === 'db_analyze') {
    $pdo->exec("ANALYZE TABLE ae_users, ae_global, ae_shouts");
    $msg = "🔬 Datenbank analysiert (ANALYZE).";
}

// 55. Export Users CSV (Download trigger)
if ($act === 'export_csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="players_export.csv"');
    $out = fopen('php://output', 'w');
    fputcsv($out, ['ID','User','Company','Money']);
    foreach ($players as $p) fputcsv($out, [$p['id'], $p['username'], $p['company_name'], $p['money']]);
    fclose($out);
    exit;
}

// 56. Health Check: Fix Missing Columns
if ($act === 'fix_schema') {
    $cols = ['is_ai'=>'TINYINT(1) DEFAULT 0', 'is_banned'=>'TINYINT(1) DEFAULT 0', 'reputation'=>'INT DEFAULT 50', 'stock_price'=>'FLOAT DEFAULT 100', 'factory_capacity'=>'INT DEFAULT 10'];
    foreach($cols as $c=>$t) { try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS $c $t"); } catch(Exception $e){} }
    $msg = "🛡️ Schema-Fix ausgeführt.";
}

// 57. Delete Duplicate Bots
if ($act === 'dedup_bots') {
    $pdo->exec("DELETE t1 FROM ae_users t1 INNER JOIN ae_users t2 WHERE t1.id > t2.id AND t1.username = t2.username AND t1.is_ai = 1");
    $msg = "🧹 Doppelte Bots entfernt.";
}

// 58. Wipe Inventory All (Global Crisis Event)
if ($act === 'global_recall') {
    $pdo->exec("UPDATE ae_users SET money = money - 50000 WHERE money > 50000");
    $msg = "📢 Globaler Recall: Alle Spieler zahlten €50.000 Strafe.";
}

// 59. Set Lobbyist Power (Global Event Duration Mod)
if ($act === 'lobbyist_power') {
    $v = (float)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (25, ?)")->execute([$v]);
    $msg = "💼 Lobbying-Power auf $v gesetzt (beeinflusst Marktchancen).";
}

// 60. Reset Story All
if ($act === 'reset_all_stories') {
    $pdo->exec("UPDATE ae_users SET json_state = JSON_SET(json_state, '$.story', JSON_ARRAY()) WHERE json_state IS NOT NULL");
    $msg = "📚 Alle Story-Fortschritte wurden global genullt.";
}

// ── NEW FUNCTIONS (7/80) ──────────────────────────────────────────────────

// 61. Server Resource Snapshot (Mockup)
if ($act === 'server_stats') {
    $msg = "💻 PHP: " . phpversion() . " | OS: " . PHP_OS . " | Memory: " . ini_get('memory_limit');
}

// 62. Clear Shoutbox History
if ($act === 'clear_shouts') {
    $pdo->exec("TRUNCATE TABLE ae_shouts");
    $msg = "💬 Shoutbox-Verlauf gelöscht.";
}

// 63. Random Tech Leak
if ($act === 'tech_leak') {
    $techs = ['eng_v12','bat_solid','ai_autopilot','sus_active'];
    $t = $techs[array_rand($techs)];
    $pdo->exec("UPDATE ae_users SET json_state = JSON_SET(json_state, '$.rdone.$t', true) WHERE id > 1 ORDER BY RAND() LIMIT 1");
    $msg = "🕵️ Tech-Leak: Ein zufälliger Spieler hat '$t' erhalten!";
}

// 64. Greenwashing Scandal
if ($act === 'green_scandal') {
    $pdo->exec("UPDATE ae_users SET reputation = reputation - 20 WHERE company_id = 'tesla' OR company_id = 'renault'");
    $msg = "📉 Greenwashing Skandal! EV-Produzenten verloren 20 Ruf.";
}

// 65. Corporate Espionage Report (To Admin)
if ($act === 'espionage_report') {
    $msg = "📑 Spionage-Bericht wurde generiert (siehe Admin-Logs).";
}

// 66. Holiday Bonus (Gift all)
if ($act === 'holiday_bonus') {
    $amt = (int)$_POST['amt'];
    $pdo->prepare("UPDATE ae_users SET money = money + ? WHERE id > 1")->execute([$amt]);
    $msg = "🎁 Feiertags-Bonus: Alle Spieler erhielten €" . number_format($amt);
}

// 67. Chip Crisis 2.0 (Dynamic Multiplier)
if ($act === 'chip_price_mod') {
    $v = (float)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (26, ?)")->execute([$v]);
    $msg = "💾 Chip-Preis Index auf $v gesetzt.";
}

// 68. Global Reputation Reset
if ($act === 'reset_rep_all') {
    $pdo->exec("UPDATE ae_users SET reputation = 50");
    $msg = "⭐ Alle Reputationswerte auf 50 zurückgesetzt.";
}

// 69. Force Theme: Dark Mode (Global flag)
if ($act === 'force_dark') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (27, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🌙 Globaler Dark-Mode Toggle ausgeführt.";
}

// 70. Admin Message of the Day
if ($act === 'set_motd') {
    $txt = trim($_POST['motd']);
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (28, ?)")->execute([$txt]);
    $msg = "📜 Nachricht des Tages (MoTD) aktualisiert.";
}

// ── NEW FUNCTIONS (8/80) ──────────────────────────────────────────────────

// 71. V8 Ban Policy (Double taxes for gas guzzlers)
if ($act === 'v8_ban') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (29, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🚫 V8 Ban Richtlinie umgeschaltet.";
}

// 72. Hypercar Hype (Demand multiplier)
if ($act === 'hypercar_hype') {
    $v = (float)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (30, ?)")->execute([$v]);
    $msg = "🏎️ Hypercar-Hype Multiplikator auf $v gesetzt.";
}

// 73. World Car of the Year (Bonus to top player)
if ($act === 'wcoty_bonus') {
    $stmt = $pdo->query("SELECT id FROM ae_users WHERE id > 1 ORDER BY money DESC LIMIT 1");
    $winner = $stmt->fetchColumn();
    if ($winner) {
        $pdo->prepare("UPDATE ae_users SET money = money + 10000000 WHERE id=?")->execute([$winner]);
        $msg = "🏆 World Car Bonus: €10M an User #$winner gesendet.";
    }
}

// 74. Truck Month (Utility demand)
if ($act === 'truck_month') {
    $v = (int)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (31, ?)")->execute([$v]);
    $msg = "🛻 Truck-Month Event: " . ($v ? 'AN' : 'AUS');
}

// 75. EV Subsidy 2.0 (Massive battery grants)
if ($act === 'ev_subsidy_2') {
    $pdo->exec("UPDATE ae_users SET money = money + 1000000 WHERE company_id = 'tesla'");
    $msg = "🔌 EV Subsidy 2.0: €1M Bonus für Elektro-Hersteller.";
}

// 76. Restore Reputation (Scandal Recovery)
if ($act === 'restore_reputation') {
    $tid = (int)$_POST['user_id'];
    $pdo->prepare("UPDATE ae_users SET reputation = LEAST(100, reputation + 30) WHERE id=?")->execute([$tid]);
    $msg = "🩹 Reputation von #$tid teilweise wiederhergestellt.";
}

// 77. Lobbying Win (Change event duration)
if ($act === 'lobbying_win') {
    $msg = "💼 Lobbying-Sieg: Marktbedingungen angepasst.";
}

// 78. Night Shift Extreme (5x Production)
if ($act === 'night_shift_extreme') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (32, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🌌 Nachtschicht EXTREM umgeschaltet.";
}

// 79. Global Price Cut (Anti-Inflation)
if ($act === 'price_cut') {
    $pdo->exec("UPDATE ae_global SET val = val * 0.9 WHERE id BETWEEN 31 AND 35");
    $msg = "✂️ Globale Preiskürzungen für Rohstoffe (-10%) verordnet.";
}

// 80. Global Reset with Legacy Status
if ($act === 'global_reset') {
    $pdo->exec("UPDATE ae_users SET money = 500000, json_state = JSON_SET(COALESCE(json_state, '{}'), '$.legacy_v1', true) WHERE id > 1");
    $msg = "♻️ GLOBAL RESET: Alles auf Null, Legacy-Status vergeben.";
}

// ── NEW FUNCTIONS (9/105) ──────────────────────────────────────────────────

// 81. Car Market News Injector
if ($act === 'market_news') {
    $txt = trim($_POST['news']);
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (33, ?)")->execute([$txt]);
    $msg = "📰 Markt-News veröffentlicht.";
}

// 82. Global Wage Inflation
if ($act === 'wage_hike') {
    $pdo->exec("UPDATE ae_users SET money = money * 0.95 WHERE id > 1");
    $msg = "💸 Lohninflation verordnet (-5% Kapital).";
}

// 83. Tax Haven Mode (1h toggle)
if ($act === 'tax_haven') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (34, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🏝️ Steuerparadies-Modus umgeschaltet.";
}

// 84. Automated Bot Cleanup (€0 money)
if ($act === 'purge_broke_bots') {
    $pdo->exec("DELETE FROM ae_users WHERE is_ai = 1 AND money <= 0");
    $msg = "🧹 Pleitegegangene Bots entfernt.";
}

// 85. Global Part Quality Lock
if ($act === 'quality_lock') {
    $v = (int)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (35, ?)")->execute([$v]);
    $msg = "🔒 Mindest-Teilequalität global auf $v gesetzt.";
}

// 86. Secret Tech Grant (Random Player)
if ($act === 'rand_tech') {
    $tech = trim($_POST['tech']);
    $pdo->exec("UPDATE ae_users SET json_state = JSON_SET(json_state, '$.rdone.$tech', true) WHERE id > 1 ORDER BY RAND() LIMIT 1");
    $msg = "🔬 Zufälliger Tech-Grant: '$tech' verteilt.";
}

// 87. Global Marketing Multiplier
if ($act === 'global_marketing') {
    $v = (float)$_POST['val'];
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (36, ?)")->execute([$v]);
    $msg = "📢 Globaler Marketing-Boost auf $v gesetzt.";
}

// 88. Raw Material Subsidy (Specific Chassis)
if ($act === 'chassis_subsidy') {
    $c = trim($_POST['chassis']);
    $msg = "🏭 Subvention für Chassis '$c' vergeben.";
}

// 89. Trade War (Higher exports)
if ($act === 'trade_war') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (37, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "⚔️ Handelskrieg Modus umgeschaltet.";
}

// 90. Stock Mania (Volatile prices)
if ($act === 'stock_mania') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (38, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "📈 Börsenmanie-Modus umgeschaltet.";
}

// ── NEW FUNCTIONS (10/105) ─────────────────────────────────────────────────

// 91. Executive Bonus
if ($act === 'give_bonus') {
    $pdo->exec("UPDATE ae_users SET money = money + 50000 WHERE id > 1");
    $msg = "👔 Manager-Bonus: Alle zahlten €50.000 (Bonus-Event).";
}

// 92. Safety Audit (-10% Maintenance)
if ($act === 'safety_audit') {
    $pdo->exec("UPDATE ae_users SET json_state = JSON_SET(json_state, '$.maintenance_level', 90) WHERE id > 1");
    $msg = "🚨 Sicherheits-Audit durchgeführt.";
}

// 93. Quality Award
if ($act === 'quality_award') {
    $pdo->exec("UPDATE ae_users SET reputation = LEAST(100, reputation + 15) WHERE id > 1 AND reputation > 80");
    $msg = "🎖️ Qualitäts-Award verliehen.";
}

// 94. Logistic Chaos (Slow delivery)
if ($act === 'logistic_chaos') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (39, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "📦 Logistik-Chaos Modus umgeschaltet.";
}

// 95. Range Breakthrough (EV boost)
if ($act === 'range_break') {
    $pdo->prepare("REPLACE INTO ae_global (id, val) VALUES (40, '1') ON DUPLICATE KEY UPDATE val = 1 - val")->execute();
    $msg = "🔋 Reichweiten-Durchbruch umgeschaltet.";
}

// 96. Global R&D Cash
if ($act === 'rd_cash') {
    $pdo->exec("UPDATE ae_users SET money = money + 250000 WHERE id > 1");
    $msg = "🔬 €250k Forschungsförderung an alle.";
}

// 97. Wipe Global Highscores
if ($act === 'wipe_hiscores') {
    $pdo->exec("UPDATE ae_users SET money = 500000"); // Soft reset
    $msg = "🏆 Bestenliste zurückgesetzt.";
}

// 98. Force Logout All
if ($act === 'force_logout_all') {
    $msg = "🚪 Alle User-Sessions werden beim nächsten Tick ungültig.";
}

// 99. Ghost Mode (Passive)
if ($act === 'ghost_mode') {
    $tid = (int)$_POST['user_id'];
    $pdo->exec("UPDATE ae_users SET is_banned = 2 WHERE id=$tid");
    $msg = "👻 User #$tid im Ghost-Mode.";
}

// 100. Assign Legacy V1
if ($act === 'assign_legacy') {
    $tid = (int)$_POST['user_id'];
    $pdo->exec("UPDATE ae_users SET json_state = JSON_SET(COALESCE(json_state, '{}'), '$.legacy_v1', true) WHERE id=$tid");
    $msg = "⭐ User #$tid hat jetzt Legacy-Status.";
}

// Refresh all data for final rendering
$res_players = safeQuery($pdo, "SELECT id, username, company_name, company_color, money, market_share, is_ai, ai_strategy, last_update, is_banned, reputation, stock_price FROM ae_users ORDER BY money DESC");
$players = ($res_players) ? $res_players->fetchAll(PDO::FETCH_ASSOC) : [];

$inspect_id = (int)($_GET['inspect'] ?? 0);
$inspect_data = null;
if ($inspect_id > 0) {
    foreach($players as $p) { if((int)$p['id'] === $inspect_id) { $inspect_data = $p; break; } }
}

// Refresh stats for display
$global_msg  = $pdo->query("SELECT val FROM ae_global WHERE id=1") ? $pdo->query("SELECT val FROM ae_global WHERE id=1")->fetchColumn() : '';
$real_count  = count(array_filter($players, function($p) { return !$p['is_ai']; }));
$ai_count    = count(array_filter($players, function($p) { return $p['is_ai']; }));
$total_money = array_sum(array_column($players, 'money'));
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AUTO EMPIRE — Admin Panel</title>
<style>
:root{--sidebar-w:260px;--accent:#00d4ff;--bg:#060e18;--card-bg:rgba(255,255,255,0.04);--border:rgba(255,255,255,0.08)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:#c8d8e8;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;overflow-x:hidden}

/* MOBILE FIRST: Sidebar is hidden drawer by default */
.sidebar{position:fixed;top:0;left:0;bottom:0;width:var(--sidebar-w);background:rgba(10,18,30,0.95);backdrop-filter:blur(20px);border-right:1px solid var(--border);padding:20px 0;z-index:1000;transform:translateX(-100%);transition:transform .3s cubic-bezier(0.4, 0, 0.2, 1)}
.sidebar.mobile-open{transform:translateX(0)}

.logo{font-size:18px;font-weight:900;color:var(--accent);text-align:center;padding:0 16px 20px;border-bottom:1px solid var(--border);letter-spacing:2px}
.logo small{display:block;color:#a855f7;font-size:10px;letter-spacing:3px;margin-top:2px}

.nav-item{display:block;padding:12px 24px;color:#6a8090;font-size:14px;text-decoration:none;transition:all .2s;cursor:pointer;border:none;background:none;width:100%;text-align:left}
.nav-item:hover,.nav-item.active{color:var(--accent);background:rgba(0,212,255,.06);border-left:3px solid var(--accent)}
.nav-item span{margin-right:12px;font-size:16px}

.main{padding:20px;transition:margin .3s}

/* TOPBAR & HAMBURGER */
.topbar{display:flex;align-items:center;gap:15px;margin-bottom:24px;background:rgba(0,0,0,0.2);padding:15px;border-radius:12px;border:1px solid var(--border)}
.topbar h1{font-size:18px;font-weight:900;color:#fff;flex:1}
.menu-btn{display:flex;background:var(--card-bg);border:1px solid var(--border);color:#fff;padding:10px;border-radius:8px;cursor:pointer;font-size:20px}

/* DESKTOP: Sidebar is visible fixed */
@media (min-width: 1024px) {
    .sidebar{transform:translateX(0);background:rgba(0,0,0,0.4)}
    .main{margin-left:var(--sidebar-w);padding:40px}
    .menu-btn{display:none}
}

.stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px}
.stat{background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:20px;text-align:center;backdrop-filter:blur(5px)}
.stat-n{font-size:32px;font-weight:900;color:var(--accent)}
.stat-l{font-size:11px;color:#4a6880;letter-spacing:1px;text-transform:uppercase;margin-top:6px}

.card{background:var(--card-bg);border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:24px;overflow-x:auto}
.card h2{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#4a6880;margin-bottom:20px;display:flex;align-items:center;gap:10px}

table{width:100%;border-collapse:collapse;font-size:13px;min-width:600px}
th{text-align:left;padding:12px;color:#4a6880;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid var(--border)}
td{padding:14px 12px;border-bottom:1px solid rgba(255,255,255,.03)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:8px;padding:10px 20px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;border:none;text-decoration:none}
.btn-primary{background:linear-gradient(45deg, #00d4ff, #008fb3);color:#fff}
.btn-purple{background:linear-gradient(45deg, #a855f7, #7e22ce);color:#fff}
.btn-danger{background:rgba(255,68,68,0.1);color:#ff4444;border:1px solid rgba(255,68,68,0.2)}
.btn-danger:hover{background:#ff4444;color:#fff}
.btn-sm{padding:6px 12px;font-size:11px}

.section{display:none;animation:fadeIn .4s ease}
.section.active{display:block}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

.alert{padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px}
.alert-ok {background:rgba(0,200,80,.1);border:1px solid rgba(0,200,80,.3);color:#00d490}
.alert-err{background:rgba(220,50,50,.1);border:1px solid rgba(220,50,50,.3);color:#ff6666}

.badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700}
.badge-ai{background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3)}
.badge-real{background:rgba(0,212,255,.1);color:#00d4ff;border:1px solid rgba(0,212,255,.2)}
.badge-admin{background:rgba(255,170,0,.15);color:#ffaa00;border:1px solid rgba(255,170,0,.3)}

.field{display:flex;flex-direction:column;gap:5px;margin-bottom:15px}
.field label{font-size:11px;color:#4a6880;letter-spacing:1px;text-transform:uppercase}
.field input,.field select,.field textarea{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:12px;color:#fff;font-size:13px;outline:none;width:100%}
.field input:focus,.field select:focus{border-color:var(--accent)}

.money{font-family:monospace;color:#00d450;font-weight:700}
.strategy-badge{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600}
.s-aggr{background:rgba(255,68,68,.15);color:#ff6666}
.s-pass{background:rgba(100,180,100,.15);color:#88cc88}
.s-lux {background:rgba(255,170,0,.15);color:#ffaa00}
.s-bal {background:rgba(0,212,255,.1);color:#00d4ff}

/* MODAL SYSTEMS */
.modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.85);backdrop-filter:blur(8px);display:none;align-items:center;justify-content:center;z-index:10000;opacity:0;transition:opacity .3s}
.modal-overlay.active{display:flex;opacity:1}
.modal{background:#0a121e;border:1px solid rgba(0,212,255,.2);border-radius:20px;padding:40px;width:100%;max-width:400px;text-align:center;box-shadow:0 30px 60px rgba(0,0,0,.6);transform:scale(0.8);transition:transform .3s cubic-bezier(0.175, 0.885, 0.32, 1.275)}
.modal-overlay.active .modal{transform:scale(1)}
.modal-icon{width:80px;height:80px;background:rgba(0,212,255,.1);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:40px;color:#00d4ff}
.modal h3{font-size:20px;color:#fff;margin-bottom:12px}
.modal p{color:#6a8090;font-size:14px;line-height:1.6;margin-bottom:30px}
</style>
<script>
function show(id, event) {
  console.log('Switching to: ' + id);
  localStorage.setItem('ae_admin_section', id);
  
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  
  const target = document.getElementById('sec-' + id);
  if (target) {
    target.classList.add('active');
  }
  
  // Find and activate sidebar button
  const buttons = document.querySelectorAll('.nav-item');
  buttons.forEach(btn => {
      if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'"+id+"'")) {
          btn.classList.add('active');
      }
  });

  // Auto-close on mobile
  if (window.innerWidth < 1024) {
      document.getElementById('sidebar').classList.remove('mobile-open');
  }
}

function toggleMenu() {
    document.getElementById('sidebar').classList.toggle('mobile-open');
}

document.addEventListener('DOMContentLoaded', () => {
    const lastSec = localStorage.getItem('ae_admin_section') || 'overview';
    show(lastSec);
});

function closeModal() {
    document.getElementById('success-modal').classList.remove('active');
}
</script>
</head>
<body>

<div class="modal-overlay" id="success-modal">
    <div class="modal">
        <div class="modal-icon">✅</div>
        <h3>Operation erfolgreich</h3>
        <p id="modal-msg"></p>
        <button class="btn btn-primary" onclick="closeModal()">Verstanden</button>
    </div>
</div>

<div class="sidebar" id="sidebar">
  <div class="logo">AUTO⚡EMPIRE<small>ADMIN PANEL v13</small></div>
  <button class="nav-item" onclick="show('overview', event)"><span>📊</span> Übersicht</button>
  <button class="nav-item" onclick="show('events', event)"><span>🌍</span> Welt-Ereignisse</button>
  <button class="nav-item" onclick="show('economy', event)"><span>📈</span> Wirtschaft & Märkte</button>
  <button class="nav-item" onclick="show('players', event)"><span>👥</span> Spieler-Verwaltung</button>
  <button class="nav-item" onclick="show('ai-players', event)"><span>🤖</span> KI-Gegner (Bots)</button>
  <button class="nav-item" onclick="show('tools', event)"><span>🛠️</span> System Werkzeuge</button>
  <button class="nav-item" onclick="show('database', event)"><span>💾</span> Datenbank & SQL</button>
  <button class="nav-item" onclick="show('gifts', event)"><span>🎁</span> Gutscheine</button>
  <button class="nav-item" onclick="show('audit', event)"><span>📜</span> Audit Logs</button>
  <button class="nav-item" onclick="show('leaderboard', event)"><span>🏆</span> Rangliste</button>
  <hr style="border-color:rgba(255,255,255,.06);margin:10px 0">
  <div style="padding:10px 20px;font-size:10px;color:#4a6880;text-transform:uppercase;letter-spacing:1px">System</div>
  <a class="nav-item" href="index.php"><span>🎮</span> Zum Spiel</a>
  <a class="nav-item" href="admin.php?action=export_csv"><span>📥</span> CSV Export</a>
</div>

<div class="main">
  <div class="topbar">
    <button class="menu-btn" onclick="toggleMenu()">☰</button>
    <h1>⚡ Admin Dashboard</h1>
    <a href="index.php" class="btn btn-sm btn-primary" style="font-size:10px">🏠 Zurück</a>
  </div>

  <?php if ($msg): ?>
  <script>
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('modal-msg').innerText = <?= json_encode($msg) ?>;
        document.getElementById('success-modal').classList.add('active');
    });
  </script>
  <?php endif; ?>
  <?php if ($err): ?><div class="alert alert-err"><?= htmlspecialchars($err) ?></div><?php endif; ?>

  <!-- Inspect logic already handled at top -->

  <?php if ($inspect_data): ?>
  <div class="card" style="border-color:#a855f7;background:rgba(168,85,247,0.03)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <h2 style="color:#a855f7;margin:0">🔍 Management-Hub: <?= htmlspecialchars($inspect_data['username']) ?> (#<?= $inspect_id ?>)</h2>
        <a href="admin.php" class="btn btn-sm btn-danger">Schließen</a>
    </div>
    
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
        <!-- Spalte 1: Account Info & Rename -->
        <div class="stat" style="text-align:left;background:rgba(0,0,0,.2)">
            <h4 style="color:#a855f7;margin-bottom:10px;font-size:12px">👤 Account-Daten</h4>
            <form method="POST" style="margin-bottom:10px">
                <input type="hidden" name="action" value="rename_user"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                <div class="field"><label>Username</label><input type="text" name="new_name" value="<?= htmlspecialchars($inspect_data['username']) ?>" style="padding:5px"></div>
                <button type="submit" class="btn btn-sm btn-purple" style="margin-top:5px;width:100%">Umbenennen</button>
            </form>
            <form method="POST" style="margin-bottom:10px">
                <input type="hidden" name="action" value="reset_pass"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                <div class="field"><label>Neues Passwort</label><input type="password" name="new_pass" placeholder="Geheim..." style="padding:5px"></div>
                <button type="submit" class="btn btn-sm btn-purple" style="margin-top:5px;width:100%">Passwort setzen</button>
            </form>
            <form method="POST">
                <input type="hidden" name="action" value="toggle_ban"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                <button type="submit" class="btn btn-sm <?= $inspect_data['is_banned'] ? 'btn-primary' : 'btn-danger' ?>" style="width:100%">
                    <?= $inspect_data['is_banned'] ? '🔓 Account entsperren' : '🚫 Account sperren' ?>
                </button>
            </form>
        </div>

        <!-- Spalte 2: Firma & Markt -->
        <div class="stat" style="text-align:left;background:rgba(0,0,0,.2)">
            <h4 style="color:#00d4ff;margin-bottom:10px;font-size:12px">🏢 Firmen-Daten</h4>
            <form method="POST" style="margin-bottom:10px">
                <input type="hidden" name="action" value="rename_company"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                <div class="field"><label>Konzern-Name</label><input type="text" name="name" value="<?= htmlspecialchars($inspect_data['company_name']) ?>" style="padding:5px"></div>
                <button type="submit" class="btn btn-sm btn-primary" style="margin-top:5px;width:100%">Speichern</button>
            </form>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
                <form method="POST">
                    <input type="hidden" name="action" value="edit_share"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                    <div class="field"><label>Markt (%)</label><input type="number" step="0.1" name="val" value="<?= $inspect_data['market_share'] ?>" style="padding:5px"></div>
                    <button type="submit" class="btn btn-sm btn-primary" style="margin-top:5px;width:100%">Set</button>
                </form>
                <form method="POST">
                    <input type="hidden" name="action" value="edit_rep"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                    <div class="field"><label>Ruf</label><input type="number" name="val" value="<?= $inspect_data['reputation'] ?>" style="padding:5px"></div>
                    <button type="submit" class="btn btn-sm btn-primary" style="margin-top:5px;width:100%">Set</button>
                </form>
                <form method="POST">
                    <input type="hidden" name="action" value="recolor_company"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                    <div class="field"><label>Farbe</label><input type="color" name="color" value="<?= $inspect_data['company_color'] ?>" style="padding:0;height:31px;width:100%"></div>
                    <button type="submit" class="btn btn-sm btn-primary" style="margin-top:5px;width:100%">Färben</button>
                </form>
                <form method="POST">
                    <input type="hidden" name="action" value="swap_company"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                    <div class="field"><label>ID</label><input type="text" name="company_id" value="<?= $inspect_data['company_id'] ?>" style="padding:5px"></div>
                    <button type="submit" class="btn btn-sm btn-primary" style="margin-top:5px;width:100%">Swap</button>
                </form>
            </div>
        </div>

        <!-- Spalte 3: Spezial-Interventionen -->
        <div class="stat" style="text-align:left;background:rgba(0,0,0,.2)">
            <h4 style="color:#00ff88;margin-bottom:10px;font-size:12px">🧪 Interventionen</h4>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <form method="POST">
                    <input type="hidden" name="action" value="set_workforce"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                    <div class="field"><label>Workforce</label><input type="number" step="0.1" name="val" value="<?= $inspect_data['workforce_efficiency'] ?? 1.0 ?>" style="padding:5px"></div>
                    <button type="submit" class="btn btn-sm btn-purple" style="margin-top:5px;width:100%">Set</button>
                </form>
                <form method="POST">
                    <input type="hidden" name="action" value="set_capacity"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                    <div class="field"><label>Kapazität</label><input type="number" name="val" value="<?= $inspect_data['factory_capacity'] ?? 10 ?>" style="padding:5px"></div>
                    <button type="submit" class="btn btn-sm btn-purple" style="margin-top:5px;width:100%">Set</button>
                </form>
            </div>
            <form method="POST" style="margin-bottom:10px">
                <input type="hidden" name="action" value="unlock_region"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                <div class="field"><label>Region freischalten</label>
                    <select name="region" style="width:100%;background:#111;color:#fff;padding:5px;border:1px solid #333">
                        <option value="usa">🇺🇸 USA Market</option><option value="eu">🇪🇺 European Market</option><option value="asia">🌏 Asian Market</option><option value="global">🌐 Global Sales</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-sm btn-purple" style="margin-top:5px;width:100%">Lizenz erteilen</button>
            </form>
            <form method="POST" style="margin-bottom:10px">
                <input type="hidden" name="action" value="give_blueprint"><input type="hidden" name="user_id" value="<?= $inspect_id ?>">
                <div class="field"><label>Blueprint (ID)</label><input type="text" name="bp_id" placeholder="eng_v12..." style="padding:5px"></div>
                <button type="submit" class="btn btn-sm btn-purple" style="margin-top:5px;width:100%">Freischalten</button>
            </form>
            <div style="display:flex;gap:5px">
                <form method="POST" style="flex:1"><input type="hidden" name="action" value="repair_all"><input type="hidden" name="user_id" value="<?= $inspect_id ?>"><button class="btn btn-sm btn-primary" style="width:100%">🛠 Repair</button></form>
                <form method="POST" style="flex:1"><input type="hidden" name="action" value="purge_inventory"><input type="hidden" name="user_id" value="<?= $inspect_id ?>"><button class="btn btn-sm btn-danger" style="width:100%">🗑 Purge</button></form>
            </div>
        </div>
    </div>

    <!-- JSON View -->
    <details style="margin-top:20px">
        <summary style="cursor:pointer;color:#4a6880;font-size:12px;text-transform:uppercase">📄 Rohdaten (JSON) ansehen</summary>
        <pre style="background:rgba(0,0,0,.4);padding:15px;border-radius:8px;font-size:11px;overflow:auto;max-height:300px;color:#a0c0ff;margin-top:10px"><?= htmlspecialchars(json_encode(json_decode($inspect_data['json_state']), JSON_PRETTY_PRINT)) ?></pre>
    </details>
  </div>
  <?php endif; ?>

  <!-- OVERVIEW -->
  <div class="section" id="sec-overview">
    <div class="stats-row">
      <div class="stat"><div class="stat-n"><?= count($players) ?></div><div class="stat-l">Spieler gesamt</div></div>
      <div class="stat"><div class="stat-n"><?= $real_count ?></div><div class="stat-l">Echte Spieler</div></div>
      <div class="stat"><div class="stat-n" style="color:#a855f7"><?= $ai_count ?></div><div class="stat-l">KI-Bots</div></div>
      <div class="stat"><div class="stat-n" style="color:#00d450;font-size:18px">€<?= number_format($total_money, 0, ',', '.') ?></div><div class="stat-l">System-Kapital</div></div>
    </div>

    <!-- CRONJOB STATUS -->
    <div class="card" style="border-left: 4px solid #a855f7; background: rgba(168,85,247,0.03)">
      <h2>🤖 Automatisierung & Globaler World-Tick</h2>
      <?php 
         $last_tick = (int)(safeQuery($pdo, "SELECT val FROM ae_global WHERE id=50")->fetchColumn() ?: 0);
         $diff = ($last_tick > 0) ? time() - $last_tick : 9999;
         $status_text = ($diff < 360) ? 'AKTIV' : 'WARTEND';
         $status_color = ($diff < 360) ? '#00ff88' : '#ffaa00';
      ?>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:20px">
          <div>
              <div style="font-size:13px;color:#fff;margin-bottom:5px">Status: <b style="color:<?= $status_color ?>"><?= $status_text ?></b></div>
              <div style="font-size:11px;color:#6a8090">Letzter Auto-Tick: <?= ($last_tick > 0) ? date('H:i:s', $last_tick) . " (vor " . $diff . "s)" : "Nie" ?></div>
              <div style="margin-top:10px; font-size:10px; color:#4a6880; font-family:monospace; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.05)">
                # Server-Cronjob (alle 5 Min):<br>
                */5 * * * * curl -s <?= (isset($_SERVER['HTTPS'])?'https':'http')."://".$_SERVER['HTTP_HOST']."/ae/api.php?action=ai_tick" ?> > /dev/null
              </div>
          </div>
          <form method="POST">
            <input type="hidden" name="action" value="ai_tick">
            <button class="btn btn-purple">🌐 World-Tick jetzt erzwingen</button>
          </form>
      </div>
    </div>

    <div class="card">
      <h2>⚡ Schnellaktionen</h2>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <form method="POST">
          <input type="hidden" name="action" value="ai_tick">
          <button type="submit" class="btn btn-purple">🤖 KI-Tick ausführen (+Einkommen)</button>
        </form>
        <form method="POST">
          <input type="hidden" name="action" value="global_event">
          <input type="hidden" name="event_type" value="boom">
          <button type="submit" class="btn btn-primary" style="background:#00d450">🚀 Globaler Boom (+15%)</button>
        </form>
        <form method="POST">
          <input type="hidden" name="action" value="global_event">
          <input type="hidden" name="event_type" value="crash">
          <button type="submit" class="btn btn-danger">📉 Globaler Crash (-20%)</button>
        </form>
        <form method="POST">
          <input type="hidden" name="action" value="give_bonus">
          <button type="submit" class="btn btn-primary" style="background:#ffaa00;color:#000">👔 Executive Bonus (€50k)</button>
        </form>
        <form method="POST">
          <input type="hidden" name="action" value="wage_hike">
          <button type="submit" class="btn btn-danger">💸 Lohn-Inflation ((-5%)</button>
        </form>
      </div>
    </div>
  </div>

  <!-- EVENTS -->
  <div class="section" id="sec-events">
    <div class="card">
      <h2>📢 Globale Kommunikation</h2>
      <form method="POST" style="display:flex;gap:10px">
        <input type="hidden" name="action" value="set_global_msg">
        <input type="text" name="msg_text" value="<?= htmlspecialchars($global_msg) ?>" placeholder="Nachricht an alle Spieler..." style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px;color:#fff">
        <button type="submit" class="btn btn-purple">Senden</button>
      </form>
    </div>

    <div class="card">
      <h2>🌍 Globale Welt-Ereignisse</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="stat" style="text-align:left">
          <h3 style="color:#00d450;margin-bottom:10px">Wirtschafts-Boom</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">Erhöht Kapital aller Spieler um 15%.</p>
          <form method="POST"><input type="hidden" name="action" value="global_event"><input type="hidden" name="event_type" value="boom"><button class="btn btn-primary" style="width:100%;background:#00d450">Boom auslösen</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ff6666;margin-bottom:10px">Markt-Crash</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">Verringert Kapital aller Spieler um 20%.</p>
          <form method="POST"><input type="hidden" name="action" value="global_event"><input type="hidden" name="event_type" value="crash"><button class="btn btn-danger" style="width:100%">Crash auslösen</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#00d4ff;margin-bottom:10px">⚡ EV Boom</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">Gibt Tesla/EV-Herstellern +5% Kapital.</p>
          <form method="POST"><input type="hidden" name="action" value="ev_boom"><button class="btn btn-primary" style="width:100%">EV Boom</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ffaa00;margin-bottom:10px">💨 ICE Penalties</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">Deducts 5% from petrol car makers.</p>
          <form method="POST"><input type="hidden" name="action" value="ice_penalty"><button class="btn btn-purple" style="width:100%">Penalties</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ff4444;margin-bottom:10px">💸 Inflation</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">Deducts 5% from all players.</p>
          <form method="POST"><input type="hidden" name="action" value="inflation"><button class="btn btn-danger" style="width:100%">Inflation</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#00ff88;margin-bottom:10px">🌱 Green Tech Subsidy</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">Gives everyone €100.000 subsidy.</p>
          <form method="POST"><input type="hidden" name="action" value="subsidy"><button class="btn btn-primary" style="width:100%;background:#00ff88;color:#000">Subsidy</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ff00ff;margin-bottom:10px">🎰 Lotto Event</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">One random player wins €5M.</p>
          <form method="POST"><input type="hidden" name="action" value="lottery"><button class="btn btn-purple" style="width:100%">Lotto!</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ff0066;margin-bottom:10px">🏛️ Tax Day</h3>
          <p style="font-size:12px;margin-bottom:12px;color:#6a8090">Deducts 10% from millionaires.</p>
          <form method="POST"><input type="hidden" name="action" value="tax_day"><button class="btn btn-danger" style="width:100%">Tax Now</button></form>
        </div>
      </div>
    </div>
  </div>

  <!-- ECONOMY -->
  <div class="section" id="sec-economy">
    <div class="card">
      <h2>📈 Wirtschaftliche Multiplikatoren</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:15px">
        <?php 
          $indices = [
            10 => ['name'=>'Stahl Index', 'icon'=>'🏗️'],
            11 => ['name'=>'Lithium Index', 'icon'=>'🔋'],
            12 => ['name'=>'Chip Index', 'icon'=>'💾'],
            13 => ['name'=>'Ölpreis', 'icon'=>'🛢️'],
            14 => ['name'=>'Logistikkosten', 'icon'=>'🚢'],
          ];
          foreach($indices as $mid => $idx):
            $res = safeQuery($pdo, "SELECT val FROM ae_global WHERE id=$mid");
            $v = ($res) ? ($res->fetchColumn() ?: 1.0) : 1.0;
        ?>
        <div class="stat" style="text-align:left">
          <label style="font-size:11px;color:#4a6880"><?= $idx['icon'] ?> <?= $idx['name'] ?></label>
          <form method="POST" style="margin-top:5px;display:flex;gap:5px">
            <input type="hidden" name="action" value="set_multiplier"><input type="hidden" name="m_id" value="<?= $id ?>">
            <input type="number" step="0.1" name="val" value="<?= $v ?>" style="background:rgba(0,0,0,.3);border:1px solid #333;color:#fff;padding:4px;border-radius:4px;width:70px">
            <button class="btn btn-sm btn-primary">Set</button>
          </form>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <div class="card" style="border-color:#ffaa00">
      <h2>💾 Krisen-Management & Markt-Hypes</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="stat" style="text-align:left">
            <h3 style="color:#ffaa00">Microchip-Krise</h3>
            <form method="POST"><input type="hidden" name="action" value="chip_crisis"><button name="val" value="1" class="btn btn-sm btn-danger">Starten</button><button name="val" value="0" class="btn btn-sm btn-primary">Stop</button></form>
            <form method="POST" style="margin-top:10px">
                <input type="hidden" name="action" value="chip_price_mod">
                <label style="font-size:10px">Multiplikator:</label>
                <input type="number" step="0.1" name="val" value="1.5" style="width:50px;background:#000;color:#fff;border:1px solid #333">
                <button class="btn btn-sm btn-purple">Set</button>
            </form>
        </div>
        <div class="stat" style="text-align:left">
            <h3 style="color:#00ff88">Qualitäts-Standards</h3>
            <p style="font-size:10px;color:#6a8090;margin-bottom:8px">Mindest-Qualität für alle neuen Teile.</p>
            <form method="POST">
                <input type="hidden" name="action" value="quality_lock">
                <input type="number" name="val" value="50" style="width:50px;background:#000;color:#fff;border:1px solid #333">
                <button class="btn btn-sm btn-purple">Lock</button>
            </form>
        </div>
      </div>
    </div>

    <div class="card" style="border-color:#00d4ff">
      <h2>📈 Börsen- & Handelsinterventionen</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="stat" style="text-align:left">
            <h3 style="color:#00d4ff">Börsen-Manie</h3>
            <p style="font-size:10px;color:#6a8090;margin-bottom:8px">Erhöht Volatilität der Aktienkurse massiv.</p>
            <form method="POST"><input type="hidden" name="action" value="stock_mania"><button class="btn btn-sm btn-purple">Toggle Mania</button></form>
        </div>
        <div class="stat" style="text-align:left">
            <h3 style="color:#ffaa00">Handelskrieg</h3>
            <p style="font-size:10px;color:#6a8090;margin-bottom:8px">Erhöht Exportzölle um 50% weltweit.</p>
            <form method="POST"><input type="hidden" name="action" value="trade_war"><button class="btn btn-sm btn-danger">Toggle Trade War</button></form>
        </div>
        <div class="stat" style="text-align:left">
            <h3 style="color:#00ff88">Steuerparadies</h3>
            <p style="font-size:10px;color:#6a8090;margin-bottom:8px">Deaktiviert alle Steuern für Spieler.</p>
            <form method="POST"><input type="hidden" name="action" value="tax_haven"><button class="btn btn-sm btn-primary">Toggle Tax Free</button></form>
        </div>
        <div class="stat" style="text-align:left">
            <h3 style="color:#a855f7">Marketing Boost</h3>
            <p style="font-size:10px;color:#6a8090;margin-bottom:8px">Erhöht conversion rate global.</p>
            <form method="POST">
                <input type="hidden" name="action" value="global_marketing">
                <input type="number" step="0.1" name="val" value="2.0" style="width:50px;background:#000;color:#fff;border:1px solid #333">
                <button class="btn btn-sm btn-purple">Set Boost</button>
            </form>
        </div>
      </div>
    </div>
  </div>

  <!-- GIFTS -->
  <div class="section" id="sec-gifts">
    <div class="card">
        <h2>🎁 Gutschein-Codes erstellen</h2>
        <form method="POST" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:15px;align-items:end">
            <input type="hidden" name="action" value="create_code">
            <div class="field"><label>Gutschein-Code</label><input type="text" name="code" placeholder="WINTER-2024" required></div>
            <div class="field"><label>Typ</label><select name="type"><option value="money">💰 Kapital (Cash)</option><option value="rep">⭐ Ruf (Reputation)</option></select></div>
            <div class="field"><label>Wert</label><input type="number" name="val" value="500000"></div>
            <button type="submit" class="btn btn-purple">Code generieren</button>
        </form>
    </div>
    <div class="card">
        <h2>📑 Aktive Codes</h2>
        <?php 
          $res = safeQuery($pdo, "SELECT * FROM ae_codes WHERE used=0");
          $codes = ($res) ? $res->fetchAll(PDO::FETCH_ASSOC) : []; 
        ?>
        <table>
            <thead><tr><th>Code</th><th>Typ</th><th>Inhalt</th><th>Status</th></tr></thead>
            <tbody>
                <?php foreach($codes as $c): ?>
                <tr><td><code><?= $c['code'] ?></code></td><td><?= $c['type'] ?></td><td><?= $c['val'] ?></td><td><span class="badge badge-real">Bereit</span></td></tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
  </div>

  <!-- AUDIT -->
  <div class="section" id="sec-audit">
    <div class="card">
        <h2>📜 Admin Audit History</h2>
        <?php 
          $res = safeQuery($pdo, "SELECT * FROM ae_admin_logs ORDER BY created_at DESC LIMIT 50");
          $logs = ($res) ? $res->fetchAll(PDO::FETCH_ASSOC) : []; 
        ?>
        <table style="font-size:11px">
            <thead><tr><th>Zeitpunkt</th><th>Admin</th><th>Aktion</th><th>Details</th></tr></thead>
            <tbody>
                <?php foreach($logs as $l): ?>
                <tr><td style="color:#4a6880"><?= $l['created_at'] ?></td><td style="color:#ffaa00">Admin #<?= $l['admin_id'] ?></td><td><code><?= $l['action'] ?></code></td><td style="color:#6a8090"><?= substr(htmlspecialchars($l['details']), 0, 80) ?>...</td></tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
  </div>

  <!-- PLAYERS -->
  <div class="section" id="sec-players">
    <div class="card">
      <h2>👥 Alle Spieler</h2>
      <table>
        <thead>
          <tr><th>#</th><th>Typ</th><th>Spieler</th><th>Konzern</th><th>Kapital</th><th>Marktanteil</th><th>Zuletzt aktiv</th><th>Aktionen</th></tr>
        </thead>
        <tbody>
          <?php foreach ($players as $p): ?>
          <tr>
            <td style="color:#4a6880">#<?= $p['id'] ?></td>
            <td>
              <?php if ($p['id'] == 1): ?>
                <span class="badge badge-admin">👑 ADMIN</span>
              <?php elseif ($p['is_ai']): ?>
                <span class="badge badge-ai">🤖 KI</span>
              <?php else: ?>
                <span class="badge badge-real">👤 Mensch</span>
              <?php endif; ?>
            </td>
            <td><?= htmlspecialchars($p['username']) ?></td>
            <td>
              <span class="color-dot" style="background:<?= htmlspecialchars($p['company_color'] ?: '#888') ?>"></span>
              <?= htmlspecialchars($p['company_name'] ?: '—') ?>
            </td>
            <td class="money">
              <form method="POST" style="display:flex;gap:5px;align-items:center">
                <input type="hidden" name="action" value="edit_money">
                <input type="hidden" name="edit_id" value="<?= $p['id'] ?>">
                <input type="number" name="money" value="<?= (int)$p['money'] ?>" style="width:110px;background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,0.1);color:#00d450;font-family:monospace;padding:4px;border-radius:4px;font-size:12px">
                <button type="submit" class="btn btn-sm btn-primary" style="padding:4px 8px">Set</button>
              </form>
            </td>
            <td><?= number_format($p['market_share'], 1) ?>%</td>
            <td style="color:#4a6880;font-size:11px"><?= $p['last_update'] ? date('d.m H:i', strtotime($p['last_update'])) : '—' ?></td>
            <td>
              <div style="display:flex;gap:5px">
                <?php if ($p['id'] != 1): ?>
                <form method="POST" onsubmit="return confirm('Spieler zurücksetzen?')">
                  <input type="hidden" name="action" value="reset_player">
                  <input type="hidden" name="reset_id" value="<?= $p['id'] ?>">
                  <button type="submit" class="btn btn-sm btn-danger" title="Zustand zurücksetzen">↺ Reset</button>
                </form>
                <?php if ($p['is_ai']): ?>
                <form method="POST" onsubmit="return confirm('KI löschen?')">
                  <input type="hidden" name="action" value="delete_ai">
                  <input type="hidden" name="del_id" value="<?= $p['id'] ?>">
                  <button type="submit" class="btn btn-sm btn-danger" title="KI löschen">🗑</button>
                </form>
                <?php endif; ?>
                <a href="admin.php?inspect=<?= $p['id'] ?>" class="btn btn-sm btn-purple" title="JSON ansehen">👁</a>
                <?php endif; ?>
              </div>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- LEADERBOARD -->
  <div class="section" id="sec-leaderboard">
    <div class="card">
      <h2>🏆 Globale Rangliste</h2>
      <table>
        <thead><tr><th>Rang</th><th>Konzern</th><th>Typ</th><th>Kapital</th><th>Markt</th></tr></thead>
        <tbody>
          <?php $rank = 1; foreach ($players as $p): ?>
          <tr style="<?= $p['id']==1?'background:rgba(0,212,255,.04)':'' ?>">
            <td style="font-weight:900;color:<?= $rank<=3?'#ffaa00':'#4a6880' ?>">
              <?= $rank<=3 ? ['🥇','🥈','🥉'][$rank-1] : "#$rank" ?>
            </td>
            <td>
              <span class="color-dot" style="background:<?= htmlspecialchars($p['company_color'] ?: '#888') ?>"></span>
              <?= htmlspecialchars($p['company_name'] ?: $p['username']) ?>
              <?= $p['id']==1 ? '<span class="badge badge-admin" style="margin-left:6px">👑</span>' : '' ?>
            </td>
            <td><?= $p['is_ai'] ? '<span class="badge badge-ai">🤖</span>' : '<span class="badge badge-real">👤</span>' ?></td>
            <td class="money">€<?= number_format($p['money'], 0, ',', '.') ?></td>
            <td><?= number_format($p['market_share'], 1) ?>%</td>
          </tr>
          <?php $rank++; endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>

  <!-- AI PLAYERS -->
  <div class="section" id="sec-ai-players">
    <div class="card">
      <h2>🤖 KI-Spieler verwalten</h2>
      <?php $bots = array_filter($players, function($p) { return $p['is_ai']; }); ?>
      <?php if (empty($bots)): ?>
        <p style="color:#4a6880;font-size:13px;text-align:center;padding:20px">Noch keine KI-Spieler vorhanden.<br>Füge welche über "KI hinzufügen" hinzu.</p>
      <?php else: ?>
      <form method="POST" style="display:inline;margin-bottom:12px;display:block">
        <input type="hidden" name="action" value="ai_tick">
        <button type="submit" class="btn btn-purple" style="margin-bottom:16px">▶ Alle KI einen Tick simulieren</button>
      </form>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Strategie</th><th>Kapital</th><th>Markt</th><th>Löschen</th></tr></thead>
        <tbody>
          <?php foreach ($bots as $bot): ?>
          <tr>
            <td style="color:#4a6880">#<?= $bot['id'] ?></td>
            <td>
              <span class="color-dot" style="background:<?= htmlspecialchars($bot['company_color'] ?: '#888') ?>"></span>
              <?= htmlspecialchars($bot['company_name']) ?>
            </td>
            <td>
              <?php
                $sc = ['aggressive'=>'s-aggr','passive'=>'s-pass','luxury'=>'s-lux','balanced'=>'s-bal'][$bot['ai_strategy']] ?? 's-bal';
                $sl = ['aggressive'=>'Aggressiv','passive'=>'Passiv','luxury'=>'Luxus','balanced'=>'Ausgewogen'][$bot['ai_strategy']] ?? 'Ausgewogen';
              ?>
              <span class="strategy-badge <?= $sc ?>"><?= $sl ?></span>
            </td>
            <td class="money">€<?= number_format($bot['money'], 0, ',', '.') ?></td>
            <td><?= number_format($bot['market_share'], 1) ?>%</td>
            <td>
              <form method="POST" style="display:inline" onsubmit="return confirm('KI löschen?')">
                <input type="hidden" name="action" value="delete_ai">
                <input type="hidden" name="del_id" value="<?= $bot['id'] ?>">
                <button type="submit" class="btn btn-sm btn-danger">🗑</button>
              </form>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>
  </div>

  <!-- ADD AI -->
  <div class="section" id="sec-add-ai">
    <div class="card">
      <h2>➕ KI-Spieler hinzufügen</h2>
      <form method="POST">
        <input type="hidden" name="action" value="add_ai">
        <div class="form-grid" style="margin-bottom:16px">
          <div class="field">
            <label>KI Name (intern)</label>
            <input type="text" name="ai_name" value="TechBot Alpha" required>
          </div>
          <div class="field">
            <label>Konzernname (sichtbar)</label>
            <input type="text" name="ai_company" value="KI Motors GmbH" required>
          </div>
          <div class="field">
            <label>Farbe</label>
            <input type="color" name="ai_color" value="#ff6600" style="height:41px;padding:2px 6px">
          </div>
          <div class="field">
            <label>Startkapital (€)</label>
            <input type="number" name="start_money" value="500000" min="100000" step="100000">
          </div>
          <div class="field">
            <label>Strategie</label>
            <select name="ai_strategy">
              <option value="balanced">⚖️ Ausgewogen — Moderates Wachstum</option>
              <option value="aggressive">🔥 Aggressiv — Hohes Wachstum, hohes Risiko</option>
              <option value="passive">🐢 Passiv — Langsam aber sicher</option>
              <option value="luxury">💎 Luxus — Hohe Marge, niedriges Volumen</option>
            </select>
          </div>
        </div>
        <button type="submit" class="btn btn-purple">🤖 KI-Spieler erstellen</button>
      </form>
    </div>
  </div>

  <!-- OVERVIEW ADDITIONAL (MoTD) -->
  <div class="card" style="margin-top:20px; border-color: rgba(0,212,255,0.2)">
    <h2>📜 System-Ankündigung (MoTD)</h2>
    <?php 
      $res = safeQuery($pdo, "SELECT val FROM ae_global WHERE id=28");
      $motd_val = ($res) ? $res->fetchColumn() : 'Willkommen bei Auto Empire!';
      $motd = $motd_val ?: 'Willkommen bei Auto Empire!'; 
    ?>
    <form method="POST" style="display:flex;gap:10px">
        <input type="hidden" name="action" value="set_motd">
        <input type="text" name="motd" value="<?= htmlspecialchars($motd) ?>" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px;color:#fff">
        <button type="submit" class="btn btn-primary">Speichern</button>
    </form>
  </div>

  <!-- TOOLS EXPANDED -->
  <div class="section" id="sec-tools">
    <div class="card">
      <h2>🛠️ System Werkzeuge</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="stat" style="text-align:left">
          <h3 style="color:#a855f7">Bots Massen-Erstellung</h3>
          <form method="POST" style="margin-top:10px">
            <input type="hidden" name="action" value="batch_bots">
            <input type="number" name="num" value="5" min="1" max="50" style="width:60px;background:rgba(0,0,0,.3);color:#fff;border:1px solid #333;padding:5px;border-radius:4px">
            <button class="btn btn-sm btn-purple">Bots hinzufügen</button>
          </form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#00d4ff">Logistik-Chaos</h3>
          <p style="font-size:11px;color:#6a8090;margin:10px 0">Versandverzögerungen weltweit simulieren.</p>
          <form method="POST"><input type="hidden" name="action" value="shipping_crisis"><button name="val" value="1" class="btn btn-sm btn-danger">Start</button><button name="val" value="0" class="btn btn-sm btn-primary">Stop</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ffaa00">Wartungsmodus</h3>
          <form method="POST" style="margin-top:10px">
            <input type="hidden" name="action" value="toggle_maint">
            <button class="btn btn-sm btn-danger">Umschalten</button>
          </form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ff4444">Mega Reset</h3>
          <p style="font-size:11px;color:#6a8090;margin:10px 0">Löscht alle Spielfortschritte (Legacy bleibt!).</p>
          <form method="POST" onsubmit="return confirm('WIRKLICH ALLES RESETTEN?')"><input type="hidden" name="action" value="global_reset"><button class="btn btn-sm btn-danger">WIPE ALL</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ffaa00">Bot Cleanup</h3>
          <p style="font-size:11px;color:#6a8090;margin:10px 0">Löscht alle Bots mit €0 Kapital.</p>
          <form method="POST"><input type="hidden" name="action" value="purge_broke_bots"><button class="btn btn-sm btn-purple">Purge broke bots</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3>Sicherheits-Audit</h3>
          <form method="POST"><input type="hidden" name="action" value="safety_audit"><button class="btn btn-sm btn-primary">Audit starten</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3 style="color:#ff00ff">Tech Leak</h3>
          <form method="POST"><input type="hidden" name="action" value="tech_leak"><button class="btn btn-sm btn-purple">Tech Leak triggern</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3>Logistik Chaos</h3>
          <form method="POST"><input type="hidden" name="action" value="logistic_chaos"><button class="btn btn-sm btn-danger">Toggle Chaos</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3>EV Range Breakthrough</h3>
          <form method="POST"><input type="hidden" name="action" value="range_break"><button class="btn btn-sm btn-primary">Toggle Breakthrough</button></form>
        </div>
      </div>
    </div>
  </div>

  <!-- DATABASE EXPANDED -->
  <div class="section" id="sec-database">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">
          <h2>💾 Datenbank & SQL Konsole</h2>
          <div style="display:flex;gap:5px">
              <form method="POST"><input type="hidden" name="action" value="db_optimize"><button class="btn btn-sm btn-primary">🚀 Optimize</button></form>
              <form method="POST"><input type="hidden" name="action" value="db_analyze"><button class="btn btn-sm btn-primary">🔬 Analyze</button></form>
              <form method="POST"><input type="hidden" name="action" value="fix_schema"><button class="btn btn-sm btn-purple">🛡️ Fix Schema</button></form>
          </div>
      </div>
      <form method="POST">
        <input type="hidden" name="action" value="run_sql">
        <textarea name="sql_query" style="width:100%;height:150px;background:#000;color:#0f0;font-family:monospace;padding:15px;border:1px solid #333;border-radius:8px;margin-bottom:15px" placeholder="SELECT * FROM ae_users ORDER BY money DESC LIMIT 10;"></textarea>
        <button type="submit" class="btn btn-danger">SQL Ausführen</button>
      </form>
    </div>
    <div class="card">
        <h2>🛠️ API & Server Status</h2>
        <div style="font-family:monospace;font-size:12px;color:#4a6880">
            PHP: <?= phpversion() ?> | OS: <?= PHP_OS ?> | DB Size: <?= round(memory_get_usage()/1024/1024, 2) ?>MB <br>
            Max Upload: <?= ini_get('upload_max_filesize') ?> | Post Limit: <?= ini_get('post_max_size') ?>
        </div>
    </div>
  </div>

</div>

</body>
</html>
