<?php
session_start();
require_once 'vendor/autoload.php';

$loader = new \Twig\Loader\FilesystemLoader('app/views');
$twig = new \Twig\Environment($loader);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $db_host = $_POST['db_host'] ?? 'localhost';
    $db_user = $_POST['db_user'] ?? 'root';
    $db_pass = $_POST['db_pass'] ?? '';
    $db_name = $_POST['db_name'] ?? 'autoempire';

    try {
        $pdo = new PDO("mysql:host=$db_host", $db_user, $db_pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        // Create DB if not exists
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `$db_name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `$db_name`");

        // Schema setup
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS ae_users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                company_name VARCHAR(50) NOT NULL,
                color VARCHAR(7) DEFAULT '#00d4ff',
                money BIGINT DEFAULT 500000,
                last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
                json_state LONGTEXT
            );
            CREATE TABLE IF NOT EXISTS ae_game_configs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category VARCHAR(50) UNIQUE NOT NULL,
                raw_js LONGTEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ae_market (
                id INT AUTO_INCREMENT PRIMARY KEY,
                total_demand BIGINT DEFAULT 100000,
                oil_price FLOAT DEFAULT 80.0,
                steel_price FLOAT DEFAULT 600.0,
                last_update DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");

        // Clear existing config and insert from file
        $pdo->exec("TRUNCATE TABLE ae_game_configs;");
        $sql = file_get_contents('install_data.sql');
        if ($sql) {
            $pdo->exec($sql);
        }

        // Write config.php
        $config_content = "<?php\n"
            ."define('DB_HOST', '$db_host');\n"
            ."define('DB_USER', '$db_user');\n"
            ."define('DB_PASS', '$db_pass');\n"
            ."define('DB_NAME', '$db_name');\n"
            ."function getPDO() {\n"
            ."  return new PDO('mysql:host='.DB_HOST.';dbname='.DB_NAME, DB_USER, DB_PASS, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);\n"
            ."}\n"
            ."?>";
        file_put_contents('config.php', $config_content);

        echo $twig->render('install_success.twig', ['message' => 'Das Multiplayer-Backend und die Datenbank wurden erfolgreich eingerichtet! Du kannst /index.php aufrufen.']);
        exit;
    } catch(PDOException $e) {
         echo $twig->render('install.twig', ['error' => $e->getMessage()]);
         exit;
    }
} else {
    echo $twig->render('install.twig', []);
}
