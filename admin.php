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

// Reset player state
if ($act === 'reset_player') {
    $reset_id = (int)($_POST['reset_id'] ?? 0);
    if ($reset_id > 0) {
        $pdo->prepare("UPDATE ae_users SET json_state=NULL, company_id=NULL, money=500000, market_share=0 WHERE id=?")->execute([$reset_id]);
        $msg = "✅ Spieler #$reset_id wurde zurückgesetzt.";
    }
}

// Ensure columns
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS is_ai TINYINT(1) DEFAULT 0"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS ai_strategy VARCHAR(30) DEFAULT 'balanced'"); } catch(Exception $e){}
try { $pdo->exec("ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS market_share FLOAT DEFAULT 0"); } catch(Exception $e){}

// Load data
$players = $pdo->query("SELECT id, username, company_name, company_color, money, market_share, is_ai, ai_strategy, last_update FROM ae_users ORDER BY money DESC")->fetchAll(PDO::FETCH_ASSOC);
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
  <button class="nav-item" onclick="show('players')"><span>👥</span> Spieler</button>
  <button class="nav-item" onclick="show('leaderboard')"><span>🏆</span> Rangliste</button>
  <button class="nav-item" onclick="show('ai-players')"><span>🤖</span> KI-Spieler</button>
  <button class="nav-item" onclick="show('add-ai')"><span>➕</span> KI hinzufügen</button>
  <hr style="border-color:rgba(255,255,255,.06);margin:10px 0">
  <a class="nav-item" href="index.php"><span>🎮</span> Zum Spiel</a>
  <a class="nav-item" href="update.php?token=ae_update_2024"><span>🔄</span> DB Update</a>
</div>

<div class="main">
  <div class="topbar">
    <h1>⚡ Auto Empire Admin</h1>
    <a href="index.php" style="color:#4a6880;text-decoration:none;font-size:13px">← Zum Spiel</a>
  </div>

  <?php if ($msg): ?><div class="alert alert-ok"><?= htmlspecialchars($msg) ?></div><?php endif; ?>
  <?php if ($err): ?><div class="alert alert-err"><?= htmlspecialchars($err) ?></div><?php endif; ?>

  <!-- OVERVIEW -->
  <div class="section active" id="sec-overview">
    <div class="stats-row">
      <div class="stat"><div class="stat-n"><?= count($players) ?></div><div class="stat-l">Spieler gesamt</div></div>
      <div class="stat"><div class="stat-n"><?= $real_count ?></div><div class="stat-l">Echte Spieler</div></div>
      <div class="stat"><div class="stat-n" style="color:#a855f7"><?= $ai_count ?></div><div class="stat-l">KI-Bots</div></div>
      <div class="stat"><div class="stat-n" style="color:#00d450;font-size:18px">€<?= number_format($total_money, 0, ',', '.') ?></div><div class="stat-l">Gesamt-Kapital</div></div>
    </div>

    <div class="card">
      <h2>⚡ Schnellaktionen</h2>
      <form method="POST" style="display:inline">
        <input type="hidden" name="action" value="ai_tick">
        <button type="submit" class="btn btn-purple">🤖 KI-Tick ausführen (alle Bots +Einkommen)</button>
      </form>
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
            <td class="money">€<?= number_format($p['money'], 0, ',', '.') ?></td>
            <td><?= number_format($p['market_share'], 1) ?>%</td>
            <td style="color:#4a6880;font-size:11px"><?= $p['last_update'] ? date('d.m H:i', strtotime($p['last_update'])) : '—' ?></td>
            <td>
              <?php if ($p['id'] != 1): ?>
              <form method="POST" style="display:inline" onsubmit="return confirm('Spieler zurücksetzen?')">
                <input type="hidden" name="action" value="reset_player">
                <input type="hidden" name="reset_id" value="<?= $p['id'] ?>">
                <button type="submit" class="btn btn-sm btn-danger">↺ Reset</button>
              </form>
              <?php if ($p['is_ai']): ?>
              <form method="POST" style="display:inline" onsubmit="return confirm('KI löschen?')">
                <input type="hidden" name="action" value="delete_ai">
                <input type="hidden" name="del_id" value="<?= $p['id'] ?>">
                <button type="submit" class="btn btn-sm btn-danger">🗑</button>
              </form>
              <?php endif; ?>
              <?php endif; ?>
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
        <div style="background:rgba(168,85,247,.06);border:1px solid rgba(168,85,247,.2);border-radius:10px;padding:14px;margin-bottom:16px;font-size:12px;color:#a0a8c0">
          <strong style="color:#a855f7">ℹ️ KI-Verhalten:</strong><br>
          Aggressiv: +80k–160k €/Tick · Passiv: +20k–60k €/Tick · Luxus: +50k–140k €/Tick · Ausgewogen: +40k–100k €/Tick<br>
          <small>Ticks werden manuell oder per Cronjob ausgelöst (update.php oder cron)</small>
        </div>
        <button type="submit" class="btn btn-purple">🤖 KI-Spieler erstellen</button>
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
