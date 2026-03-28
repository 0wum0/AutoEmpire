<?php
session_start();

if (!file_exists('config.php')) {
    header('Location: install.php');
    exit;
}
require_once 'config.php';

// Check for maintenance mode
try {
    $m_pdo = getPDO();
    $maint = $m_pdo->query("SELECT val FROM ae_global WHERE id=2")->fetchColumn();
    if ($maint == '1' && (!isset($_SESSION['user_id']) || (int)$_SESSION['user_id'] !== 1)) {
        die('<!DOCTYPE html><html><body style="background:#060e18;color:#ffaa00;font-family:monospace;padding:40px;text-align:center"><h2>🛠 Wartungsarbeiten</h2><p>Das Spiel wird gerade aktualisiert. Bitte versuche es in wenigen Minuten erneut.</p><p style="color:#4a6880;font-size:10px">Status: Active Maintenance</p></body></html>');
    }
} catch(Exception $e) {}

require_once 'vendor/autoload.php';

try {
    $pdo = getPDO();
} catch (Exception $e) {
    die("Database Error. Please run install.php.");
}

$loader = new \Twig\Loader\FilesystemLoader('app/views');
$twig = new \Twig\Environment($loader);

// Logout
if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: index.php');
    exit;
}

// Handling form submissions
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $user = trim($_POST['username'] ?? '');
    $pass = $_POST['password'] ?? '';
    
    if (isset($_POST['register'])) {
        $comp = trim($_POST['company'] ?? 'MyCompany');
        if (strlen($user)>2 && strlen($pass)>3) {
            $stmt = $pdo->prepare("SELECT id FROM ae_users WHERE username=?");
            $stmt->execute([$user]);
            if ($stmt->fetch()) {
                $error = "Name schon vergeben!";
            } else {
                $hash = password_hash($pass, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare("INSERT INTO ae_users (username, password_hash, company_name) VALUES (?, ?, ?)");
                $stmt->execute([$user, $hash, $comp]);
                $_SESSION['user_id'] = $pdo->lastInsertId();
                $_SESSION['username'] = $user;
                header('Location: index.php');
                exit;
            }
        } else {
            $error = "Eingaben ungültig.";
        }
    } elseif (isset($_POST['login'])) {
        $stmt = $pdo->prepare("SELECT id, password_hash, username FROM ae_users WHERE username=?");
        $stmt->execute([$user]);
        $row = $stmt->fetch();
        if ($row && password_verify($pass, $row['password_hash'])) {
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['username'] = $row['username'];
            header('Location: index.php');
            exit;
        } else {
            $error = "Falsche Daten.";
        }
    }
}

if (!isset($_SESSION['user_id'])) {
    echo $twig->render('auth.twig', ['error' => $error]);
    exit;
}

// Render the actual game layout
echo $twig->render('game.twig', [
    'username' => $_SESSION['username'],
    'user_id' => $_SESSION['user_id']
]);
