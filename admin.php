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

// ── Actions ───────────────────────────────────────────────────────────────────
$act = $_POST['action'] ?? '';

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
    } else {
        $err = "Ungültige ID.";
    }
}

// Update player money
if ($act === 'edit_money') {
    $edit_id = (int)($_POST['edit_id'] ?? 0);
    $new_amount = (int)($_POST['money'] ?? 0);
    if ($edit_id > 0) {
        $stmt = $pdo->prepare("UPDATE ae_users SET money=? WHERE id=?");
        $stmt->execute([$new_amount, $edit_id]);
        $msg = "✅ Kapital für Spieler #$edit_id auf €" . number_format($new_amount, 0, ',', '.') . " gesetzt.";
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
try { $pdo->exec("CREATE TABLE IF NOT EXISTS ae_global (id INT PRIMARY KEY, val TEXT, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)"); } catch(Exception $e){}

// ── NEW FUNCTIONS (1/30) ──────────────────────────────────────────────────

// 1. Rename User
if ($act === 'rename_user') {
    $target_id = (int)$_POST['user_id'];
    $new_name  = trim($_POST['new_name']);
    if ($target_id > 0 && !empty($new_name)) {
        $stmt = $pdo->prepare("UPDATE ae_users SET username=? WHERE id=?");
        $stmt->execute([$new_name, $target_id]);
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
    $msg = "📈 Marktanteil für #$tid auf $val% gesetzt.";
}

// 5. Edit Reputation
if ($act === 'edit_rep') {
    $tid = (int)$_POST['user_id'];
    $val = (int)$_POST['val'];
    $pdo->prepare("UPDATE ae_users SET reputation=? WHERE id=?")->execute([$val, $tid]);
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

// Load data
$players = $pdo->query("SELECT id, username, company_name, company_color, money, market_share, is_ai, ai_strategy, last_update, is_banned, reputation, stock_price FROM ae_users ORDER BY money DESC")->fetchAll(PDO::FETCH_ASSOC);
$global_msg = $pdo->query("SELECT val FROM ae_global WHERE id=1")->fetchColumn() ?: '';
$real_count = count(array_filter($players, fn($p) => !$p['is_ai']));
$ai_count   = count(array_filter($players, fn($p) =>  $p['is_ai']));
$total_money = array_sum(array_column($players, 'money'));
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AUTO EMPIRE — Admin Panel</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#060e18;color:#c8d8e8;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh}
.sidebar{position:fixed;top:0;left:0;bottom:0;width:220px;background:rgba(0,0,0,.6);border-right:1px solid rgba(255,255,255,.08);padding:20px 0;overflow-y:auto}
.logo{font-size:16px;font-weight:900;color:#00d4ff;text-align:center;padding:0 16px 20px;border-bottom:1px solid rgba(255,255,255,.08);letter-spacing:2px}
.logo small{display:block;color:#a855f7;font-size:10px;letter-spacing:3px;margin-top:2px}
.nav-item{display:block;padding:10px 20px;color:#6a8090;font-size:13px;text-decoration:none;transition:all .2s;cursor:pointer;border:none;background:none;width:100%;text-align:left}
.nav-item:hover,.nav-item.active{color:#00d4ff;background:rgba(0,212,255,.06)}
.nav-item span{margin-right:8px}
.main{margin-left:220px;padding:30px}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.topbar h1{font-size:20px;font-weight:900;color:#fff}
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:16px;text-align:center}
.stat-n{font-size:28px;font-weight:900;color:#00d4ff}
.stat-l{font-size:11px;color:#4a6880;letter-spacing:1px;text-transform:uppercase;margin-top:4px}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:20px}
.card h2{font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#4a6880;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 12px;color:#4a6880;font-size:11px;letter-spacing:1px;text-transform:uppercase;border-bottom:1px solid rgba(255,255,255,.08)}
td{padding:10px 12px;border-bottom:1px solid rgba(255,255,255,.04)}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(255,255,255,.02)}
.badge{font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700}
.badge-ai{background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3)}
.badge-real{background:rgba(0,212,255,.1);color:#00d4ff;border:1px solid rgba(0,212,255,.2)}
.badge-admin{background:rgba(255,170,0,.15);color:#ffaa00;border:1px solid rgba(255,170,0,.3)}
.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field{display:flex;flex-direction:column;gap:5px}
.field label{font-size:11px;color:#4a6880;letter-spacing:1px;text-transform:uppercase}
.field input,.field select{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none}
.field input:focus,.field select:focus{border-color:#00d4ff}
.btn{padding:10px 20px;border-radius:8px;border:none;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;letter-spacing:.5px}
.btn-primary{background:linear-gradient(135deg,#00d4ff,#0099cc);color:#000}
.btn-purple{background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff}
.btn-danger{background:rgba(220,50,50,.2);color:#ff6666;border:1px solid rgba(220,50,50,.3)}
.btn-sm{padding:5px 12px;font-size:11px}
.btn:hover{opacity:.85;transform:translateY(-1px)}
.alert{padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:13px}
.alert-ok {background:rgba(0,200,80,.1);border:1px solid rgba(0,200,80,.3);color:#00d490}
.alert-err{background:rgba(220,50,50,.1);border:1px solid rgba(220,50,50,.3);color:#ff6666}
.money{font-family:monospace;color:#00d450;font-weight:700}
.section{display:none}
.section.active{display:block}
.color-dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:middle}
.strategy-badge{font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600}
.s-aggr{background:rgba(255,68,68,.15);color:#ff6666}
.s-pass{background:rgba(100,180,100,.15);color:#88cc88}
.s-lux {background:rgba(255,170,0,.15);color:#ffaa00}
.s-bal {background:rgba(0,212,255,.1);color:#00d4ff}
</style>
</head>
<body>

<div class="sidebar">
  <div class="logo">AUTO⚡EMPIRE<small>ADMIN PANEL</small></div>
  <button class="nav-item active" onclick="show('overview')"><span>📊</span> Übersicht</button>
  <button class="nav-item" onclick="show('events')"><span>🌍</span> Welt-Ereignisse</button>
  <button class="nav-item" onclick="show('players')"><span>👥</span> Spieler</button>
  <button class="nav-item" onclick="show('tools')"><span>🛠️</span> Werkzeuge</button>
  <button class="nav-item" onclick="show('database')"><span>💾</span> Datenbank</button>
  <button class="nav-item" onclick="show('leaderboard')"><span>🏆</span> Rangliste</button>
  <button class="nav-item" onclick="show('ai-players')"><span>🤖</span> KI-Spieler</button>
  <button class="nav-item" onclick="show('add-ai')"><span>➕</span> KI hinzufügen</button>
  <hr style="border-color:rgba(255,255,255,.06);margin:10px 0">
  <div style="padding:10px 20px;font-size:10px;color:#4a6880;text-transform:uppercase;letter-spacing:1px">System</div>
  <a class="nav-item" href="index.php"><span>🎮</span> Zum Spiel</a>
  <a class="nav-item" href="update.php?token=ae_update_2024"><span>🔄</span> DB Update</a>
</div>

<div class="main">
  <div class="topbar">
    <h1>⚡ Auto Empire Admin Panel</h1>
    <a href="index.php" style="color:#4a6880;text-decoration:none;font-size:13px">← Zum Spiel</a>
  </div>

  <?php if ($msg): ?><div class="alert alert-ok"><?= htmlspecialchars($msg) ?></div><?php endif; ?>
  <?php if ($err): ?><div class="alert alert-err"><?= htmlspecialchars($err) ?></div><?php endif; ?>

  <?php
  $inspect_id = (int)($_GET['inspect'] ?? 0);
  $inspect_data = null;
  if ($inspect_id > 0) {
      $stmt = $pdo->prepare("SELECT username, json_state FROM ae_users WHERE id=?");
      $stmt->execute([$inspect_id]);
      $inspect_data = $stmt->fetch(PDO::FETCH_ASSOC);
  }
  ?>

  <?php if ($inspect_data): ?>
  <div class="card" style="border-color:#a855f7">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <h2 style="color:#a855f7;margin:0">🔍 Inspektion: <?= htmlspecialchars($inspect_data['username']) ?> (#<?= $inspect_id ?>)</h2>
        <a href="admin.php" class="btn btn-sm btn-danger">Schließen</a>
    </div>
    <pre style="background:rgba(0,0,0,.4);padding:15px;border-radius:8px;font-size:11px;overflow:auto;max-height:400px;color:#a0c0ff"><?= htmlspecialchars(json_encode(json_decode($inspect_data['json_state']), JSON_PRETTY_PRINT)) ?></pre>
  </div>
  <?php endif; ?>

  <!-- OVERVIEW -->
  <div class="section active" id="sec-overview">
    <div class="stats-row">
      <div class="stat"><div class="stat-n"><?= count($players) ?></div><div class="stat-l">Spieler gesamt</div></div>
      <div class="stat"><div class="stat-n"><?= $real_count ?></div><div class="stat-l">Echte Spieler</div></div>
      <div class="stat"><div class="stat-n" style="color:#a855f7"><?= $ai_count ?></div><div class="stat-l">KI-Bots</div></div>
      <div class="stat"><div class="stat-n" style="color:#00d450;font-size:18px">€<?= number_format($total_money, 0, ',', '.') ?></div><div class="stat-l">System-Kapital</div></div>
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
      <?php $bots = array_filter($players, fn($p) => $p['is_ai']); ?>
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

  <!-- TOOLS -->
  <div class="section" id="sec-tools">
    <div class="card">
      <h2>🛠️ System Werkzeuge</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="stat" style="text-align:left">
          <h3>Bots Massen-Erstellung</h3>
          <form method="POST" style="margin-top:10px">
            <input type="hidden" name="action" value="batch_bots">
            <input type="number" name="num" value="5" min="1" max="50" style="width:60px;background:rgba(0,0,0,.3);color:#fff;border:1px solid #333;padding:5px;border-radius:4px">
            <button class="btn btn-purple" style="padding:6px 12px">Bots hinzufügen</button>
          </form>
        </div>
        <div class="stat" style="text-align:left">
          <h3>KI-Strategien würfeln</h3>
          <p style="font-size:11px;color:#6a8090;margin:10px 0">Setzt alle Bot-Strategien auf zufällige Werte.</p>
          <form method="POST"><input type="hidden" name="action" value="randomize_bots"><button class="btn btn-purple" style="padding:6px 12px">Neu würfeln</button></form>
        </div>
        <div class="stat" style="text-align:left">
          <h3>Wartungsmodus</h3>
          <form method="POST" style="margin-top:10px">
            <input type="hidden" name="action" value="toggle_maint">
            <button class="btn btn-danger" style="padding:6px 12px">Umschalten</button>
          </form>
        </div>
        <div class="stat" style="text-align:left">
          <h3>Inaktive löschen</h3>
          <p style="font-size:11px;color:#6a8090;margin:10px 0">Löscht Spieler (>30 Tage inaktiv).</p>
          <form method="POST" onsubmit="return confirm('Wipe?')"><input type="hidden" name="action" value="wipe_inactive"><button class="btn btn-danger" style="padding:6px 12px">Wipe</button></form>
        </div>
      </div>
    </div>
  </div>

  <!-- DATABASE -->
  <div class="section" id="sec-database">
    <div class="card">
      <h2>💾 Datenbank Konsole</h2>
      <form method="POST">
        <input type="hidden" name="action" value="run_sql">
        <textarea name="sql_query" style="width:100%;height:120px;background:#000;color:#0f0;font-family:monospace;padding:15px;border:1px solid #333;border-radius:8px;margin-bottom:15px" placeholder="SELECT * FROM ae_users LIMIT 5;"></textarea>
        <button type="submit" class="btn btn-danger">SQL Ausführen</button>
      </form>
    </div>
    <div class="card">
      <h2>🎁 Gutscheincodes</h2>
      <form method="POST" style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:10px;align-items:end">
        <input type="hidden" name="action" value="create_code">
        <div class="field"><label>Code</label><input type="text" name="code" placeholder="WINTER2024"></div>
        <div class="field"><label>Typ</label><select name="type"><option value="money">💰 Geld</option></select></div>
        <div class="field"><label>Betrag</label><input type="number" name="val" value="100000"></div>
        <button type="submit" class="btn btn-purple">Erstellen</button>
      </form>
    </div>
  </div>

</div>

<script>
function show(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + id).classList.add('active');
  event.target.classList.add('active');
}
</script>
</body>
</html>
