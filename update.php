<?php
/**
 * AUTO EMPIRE — Database Update Tool
 * Integrates new/missing tables and columns into an existing installation.
 * Safe to run multiple times — uses IF NOT EXISTS everywhere.
 */
session_start();

// ── Security: Simple token protection ──────────────────────────────────────
// Change this token or delete update.php after running!
define('UPDATE_TOKEN', 'ae_update_2024');

$token_ok = ($_GET['token'] ?? '') === UPDATE_TOKEN || ($_POST['token'] ?? '') === UPDATE_TOKEN;
if (!$token_ok) {
    die('<html><body style="background:#060e18;color:#fff;font-family:monospace;padding:40px">
    <h2 style="color:#00d4ff">⚡ AUTO EMPIRE — Update Tool</h2>
    <p>Bitte URL mit Token aufrufen:<br>
    <code style="color:#f0a500">update.php?token=ae_update_2024</code></p></body></html>');
}

// ── Load config ─────────────────────────────────────────────────────────────
if (!file_exists('config.php')) {
    die('<p style="color:red">Fehler: config.php nicht gefunden. Bitte zuerst install.php ausführen.</p>');
}
require_once 'config.php';

// ── Migration definitions ────────────────────────────────────────────────────
// Each migration has: id (unique), description, sql (safe to run multiple times)
$migrations = [

    // ── v1.0: Core tables (install.php already creates these) ────────────────
    [
        'id'   => 'v1_users_table',
        'desc' => 'Tabelle ae_users (Benutzer)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_users (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            username      VARCHAR(50)  UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            company_name  VARCHAR(50)  NOT NULL,
            color         VARCHAR(7)   DEFAULT '#00d4ff',
            money         BIGINT       DEFAULT 500000,
            last_update   DATETIME     DEFAULT CURRENT_TIMESTAMP,
            json_state    LONGTEXT
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],
    [
        'id'   => 'v1_game_configs_table',
        'desc' => 'Tabelle ae_game_configs (Spieldaten)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_game_configs (
            id       INT AUTO_INCREMENT PRIMARY KEY,
            category VARCHAR(50)  UNIQUE NOT NULL,
            raw_js   LONGTEXT NOT NULL
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],
    [
        'id'   => 'v1_market_table',
        'desc' => 'Tabelle ae_market (Weltmarkt)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_market (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            total_demand BIGINT DEFAULT 100000,
            oil_price    FLOAT  DEFAULT 80.0,
            steel_price  FLOAT  DEFAULT 600.0,
            last_update  DATETIME DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],

    // ── v1.1: New columns on ae_users ────────────────────────────────────────
    [
        'id'   => 'v1_1_users_prestige',
        'desc' => 'Spalte prestige_points in ae_users',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS prestige_points INT DEFAULT 0",
    ],
    [
        'id'   => 'v1_1_users_esg',
        'desc' => 'Spalte esg_score in ae_users',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS esg_score INT DEFAULT 50",
    ],
    [
        'id'   => 'v1_1_users_stock_price',
        'desc' => 'Spalte stock_price in ae_users (für Börse)',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS stock_price FLOAT DEFAULT 100.0",
    ],
    [
        'id'   => 'v1_1_users_market_share',
        'desc' => 'Spalte market_share in ae_users',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS market_share FLOAT DEFAULT 0.0",
    ],
    [
        'id'   => 'v1_1_users_company_selected',
        'desc' => 'Spalte company_id in ae_users (gewählter Konzern)',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS company_id VARCHAR(30) DEFAULT NULL",
    ],

    // ── v1.2: Leaderboard / Rankings ────────────────────────────────────────
    [
        'id'   => 'v1_2_leaderboard_table',
        'desc' => 'Tabelle ae_leaderboard (Rangliste)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_leaderboard (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            score      BIGINT DEFAULT 0,
            rank_pos   INT DEFAULT 0,
            recorded   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES ae_users(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],

    // ── v1.3: Stock market / M&A ────────────────────────────────────────────
    [
        'id'   => 'v1_3_stock_history_table',
        'desc' => 'Tabelle ae_stock_history (Kursverlauf)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_stock_history (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL,
            price      FLOAT NOT NULL,
            recorded   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES ae_users(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],
    [
        'id'   => 'v1_3_acquisitions_table',
        'desc' => 'Tabelle ae_acquisitions (Übernahmen)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_acquisitions (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            buyer_id     INT NOT NULL,
            target_id    INT NOT NULL,
            price_paid   BIGINT DEFAULT 0,
            acquired_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (buyer_id)  REFERENCES ae_users(id) ON DELETE CASCADE,
            FOREIGN KEY (target_id) REFERENCES ae_users(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],

    // ── v1.4: Events & News ─────────────────────────────────────────────────
    [
        'id'   => 'v1_4_events_log_table',
        'desc' => 'Tabelle ae_events_log (globale Ereignisse)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_events_log (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT DEFAULT NULL,
            event_type VARCHAR(50) NOT NULL,
            event_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],
    [
        'id'   => 'v1_4_news_table',
        'desc' => 'Tabelle ae_news (Wirtschaftsnews)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_news (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            headline   VARCHAR(255) NOT NULL,
            body       TEXT,
            impact     VARCHAR(50) DEFAULT 'neutral',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],

    // ── v1.5: Multiplayer Sessions ───────────────────────────────────────────
    [
        'id'   => 'v1_5_sessions_table',
        'desc' => 'Tabelle ae_sessions (Online-Status)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_sessions (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_id    INT NOT NULL UNIQUE,
            last_ping  DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address VARCHAR(45),
            FOREIGN KEY (user_id) REFERENCES ae_users(id) ON DELETE CASCADE
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],

    [
        'id'   => 'v1_8_users_is_ai',
        'desc' => 'Spalte is_ai in ae_users (KI-Spieler Flag)',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS is_ai TINYINT(1) DEFAULT 0",
    ],
    [
        'id'   => 'v1_8_users_ai_strategy',
        'desc' => 'Spalte ai_strategy in ae_users',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS ai_strategy VARCHAR(30) DEFAULT 'balanced'",
    ],
    [
        'id'   => 'v1_8_users_company_id',
        'desc' => 'Spalte company_id in ae_users (gewählter Konzern, Persistenz)',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS company_id VARCHAR(30) DEFAULT NULL",
    ],
    [
        'id'   => 'v1_8_users_company_color',
        'desc' => 'Spalte company_color in ae_users',
        'sql'  => "ALTER TABLE ae_users ADD COLUMN IF NOT EXISTS company_color VARCHAR(7) DEFAULT '#00d4ff'",
    ],
    // ── v1.6: Migrations-Tracking Tabelle ───────────────────────────────────
    [
        'id'   => 'v1_6_migrations_table',
        'desc' => 'Tabelle ae_migrations (Update-Tracking)',
        'sql'  => "CREATE TABLE IF NOT EXISTS ae_migrations (
            id         VARCHAR(80) PRIMARY KEY,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],

    // ── v1.7: Market world data extension ────────────────────────────────────
    [
        'id'   => 'v1_7_market_aluminum',
        'desc' => 'Spalte aluminum_price in ae_market',
        'sql'  => "ALTER TABLE ae_market ADD COLUMN IF NOT EXISTS aluminum_price FLOAT DEFAULT 2200.0",
    ],
    [
        'id'   => 'v1_7_market_eur_usd',
        'desc' => 'Spalte eur_usd in ae_market',
        'sql'  => "ALTER TABLE ae_market ADD COLUMN IF NOT EXISTS eur_usd FLOAT DEFAULT 1.08",
    ],
    [
        'id'   => 'v1_7_market_global_demand',
        'desc' => 'Spalte global_demand_modifier in ae_market',
        'sql'  => "ALTER TABLE ae_market ADD COLUMN IF NOT EXISTS global_demand_modifier FLOAT DEFAULT 1.0",
    ],
];

// ── Process ─────────────────────────────────────────────────────────────────
$results = [];
$errors  = [];
$skipped = 0;

try {
    $pdo = getPDO();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure the migrations table exists first (is itself a migration)
    $pdo->exec("CREATE TABLE IF NOT EXISTS ae_migrations (
        id         VARCHAR(80) PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

    // Fetch already-applied migrations
    $applied = $pdo->query("SELECT id FROM ae_migrations")->fetchAll(PDO::FETCH_COLUMN);
    $applied = array_flip($applied);

    foreach ($migrations as $m) {
        if (isset($applied[$m['id']])) {
            $results[] = ['id' => $m['id'], 'desc' => $m['desc'], 'status' => 'skip'];
            $skipped++;
            continue;
        }

        try {
            $pdo->exec($m['sql']);
            // Track migration as applied
            $stmt = $pdo->prepare("INSERT IGNORE INTO ae_migrations (id) VALUES (?)");
            $stmt->execute([$m['id']]);
            $results[] = ['id' => $m['id'], 'desc' => $m['desc'], 'status' => 'ok'];
        } catch (PDOException $e) {
            // Some ALTER TABLE ... ADD COLUMN IF NOT EXISTS may not be supported on old MySQL
            // Try fallback: check if column exists first
            $msg = $e->getMessage();
            if (str_contains($m['sql'], 'ADD COLUMN') && str_contains($msg, 'Duplicate column')) {
                // Column exists, mark as done
                $stmt = $pdo->prepare("INSERT IGNORE INTO ae_migrations (id) VALUES (?)");
                $stmt->execute([$m['id']]);
                $results[] = ['id' => $m['id'], 'desc' => $m['desc'], 'status' => 'skip'];
                $skipped++;
            } else {
                $results[] = ['id' => $m['id'], 'desc' => $m['desc'], 'status' => 'error', 'msg' => $msg];
                $errors[] = $m['id'] . ': ' . $msg;
            }
        }
    }

} catch (PDOException $e) {
    $db_error = $e->getMessage();
}

$ok_count   = count(array_filter($results, fn($r) => $r['status'] === 'ok'));
$err_count  = count($errors);
?>
<!DOCTYPE html>
<html lang="de" data-theme="dark">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AUTO EMPIRE — Update Tool</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#060e18;color:#c8d8e8;font-family:'Segoe UI',system-ui,sans-serif;min-height:100vh;padding:30px 20px}
  .wrap{max-width:860px;margin:0 auto}
  .logo{font-size:28px;font-weight:900;letter-spacing:3px;color:#00d4ff;text-align:center;margin-bottom:6px}
  .logo span{color:#a855f7}
  .subtitle{text-align:center;color:#4a6880;font-size:13px;letter-spacing:2px;margin-bottom:30px}
  .card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:16px}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px}
  .stat{text-align:center;padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,.08)}
  .stat.green{background:rgba(0,212,80,.08);border-color:rgba(0,212,80,.2)}
  .stat.red  {background:rgba(220,50,50,.08);border-color:rgba(220,50,50,.2)}
  .stat.gray {background:rgba(100,120,140,.08)}
  .stat-n{font-size:36px;font-weight:900}
  .stat.green .stat-n{color:#00d450}
  .stat.red   .stat-n{color:#ff4444}
  .stat.gray  .stat-n{color:#4a6880}
  .stat-l{font-size:11px;color:#4a6880;letter-spacing:1px;text-transform:uppercase;margin-top:4px}
  h3{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#4a6880;margin-bottom:12px}
  .row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:13px}
  .row:last-child{border-bottom:none}
  .badge{font-size:10px;font-weight:700;letter-spacing:1px;padding:3px 8px;border-radius:20px;flex-shrink:0;text-transform:uppercase}
  .badge.ok  {background:rgba(0,212,80,.15);color:#00d450;border:1px solid rgba(0,212,80,.3)}
  .badge.skip{background:rgba(100,120,140,.15);color:#6a8090;border:1px solid rgba(100,120,140,.2)}
  .badge.err {background:rgba(255,68,68,.15);color:#ff6666;border:1px solid rgba(255,68,68,.3)}
  .id{color:#4a6880;font-size:10px;font-family:monospace;margin-left:auto;flex-shrink:0}
  .err-msg{font-size:11px;color:#ff8888;margin-top:4px;padding:4px 8px;background:rgba(255,68,68,.06);border-radius:6px;word-break:break-all}
  .btn-wrap{text-align:center;margin-top:24px}
  .btn{display:inline-block;padding:12px 30px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:1px;text-decoration:none;cursor:pointer;border:none;transition:all .2s}
  .btn-home{background:linear-gradient(135deg,#00d4ff,#0099cc);color:#000}
  .btn-run {background:linear-gradient(135deg,#a855f7,#7c3aed);color:#fff}
  .btn:hover{opacity:.85;transform:translateY(-1px)}
  .alert-box{padding:14px 18px;border-radius:10px;margin-bottom:20px;font-size:13px}
  .alert-err{background:rgba(220,50,50,.1);border:1px solid rgba(220,50,50,.3);color:#ff8888}
  .alert-ok {background:rgba(0,212,80,.1);border:1px solid rgba(0,212,80,.3);color:#00d490}
</style>
</head>
<body>
<div class="wrap">

  <div class="logo">AUTO<span>⚡</span>EMPIRE</div>
  <div class="subtitle">DATABASE UPDATE TOOL</div>

  <?php if (isset($db_error)): ?>
  <div class="alert-box alert-err">
    ❌ <strong>Datenbankverbindung fehlgeschlagen:</strong><br><?= htmlspecialchars($db_error) ?>
    <br><br>Bitte <code>config.php</code> prüfen oder zuerst <a href="install.php" style="color:#ff8888">install.php</a> ausführen.
  </div>
  <?php else: ?>

  <!-- Summary -->
  <div class="summary">
    <div class="stat green">
      <div class="stat-n"><?= $ok_count ?></div>
      <div class="stat-l">Angewendet</div>
    </div>
    <div class="stat gray">
      <div class="stat-n"><?= $skipped ?></div>
      <div class="stat-l">Bereits vorhanden</div>
    </div>
    <div class="stat <?= $err_count > 0 ? 'red' : 'gray' ?>">
      <div class="stat-n"><?= $err_count ?></div>
      <div class="stat-l">Fehler</div>
    </div>
  </div>

  <?php if ($ok_count > 0 && $err_count === 0): ?>
  <div class="alert-box alert-ok">✅ Update erfolgreich! <?= $ok_count ?> Migration(en) wurden angewendet.</div>
  <?php elseif ($ok_count === 0 && $err_count === 0): ?>
  <div class="alert-box alert-ok">✅ Datenbank ist bereits aktuell. Keine Änderungen notwendig.</div>
  <?php elseif ($err_count > 0): ?>
  <div class="alert-box alert-err">⚠️ <?= $err_count ?> Fehler aufgetreten. Prüfe die Details unten.</div>
  <?php endif; ?>

  <!-- Migration Details -->
  <div class="card">
    <h3>📋 Migrations-Protokoll</h3>
    <?php foreach ($results as $r): ?>
    <div class="row">
      <span class="badge <?= $r['status'] ?>">
        <?= $r['status'] === 'ok' ? '✓ NEU' : ($r['status'] === 'skip' ? '– OK' : '✗ FEHLER') ?>
      </span>
      <div>
        <div><?= htmlspecialchars($r['desc']) ?></div>
        <?php if ($r['status'] === 'error'): ?>
        <div class="err-msg"><?= htmlspecialchars($r['msg']) ?></div>
        <?php endif; ?>
      </div>
      <span class="id"><?= htmlspecialchars($r['id']) ?></span>
    </div>
    <?php endforeach; ?>
  </div>

  <?php endif; ?>

  <div class="btn-wrap">
    <a href="index.php" class="btn btn-home">🎮 Zum Spiel</a>
    &nbsp;&nbsp;
    <a href="update.php?token=<?= UPDATE_TOKEN ?>" class="btn btn-run">🔄 Erneut ausführen</a>
  </div>

  <p style="text-align:center;font-size:11px;color:#2a3840;margin-top:20px">
    ⚠️ Sicherheitshinweis: Lösche oder schütze update.php nach dem Update mit einem Passwort.
  </p>

</div>
</body>
</html>
