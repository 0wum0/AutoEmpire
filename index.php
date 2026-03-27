<?php
session_start();

if (!file_exists('config.php')) {
    header('Location: install.php');
    exit;
}
require_once 'config.php';
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
