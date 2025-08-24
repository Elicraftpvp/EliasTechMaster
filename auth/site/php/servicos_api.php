<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'conexao.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT * FROM servicos WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch());
            } else {
                $stmt = $pdo->query("SELECT id, nome, descricao, valor FROM servicos ORDER BY nome ASC");
                echo json_encode($stmt->fetchAll());
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $sql = "INSERT INTO servicos (nome, descricao, valor) VALUES (?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['nome'], $data['descricao'], (float)$data['valor']]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            parse_str(file_get_contents("php://input"), $data);
            $sql = "UPDATE servicos SET nome = ?, descricao = ?, valor = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['nome'], $data['descricao'], (float)$data['valor'], $id]);
            echo json_encode(['success' => true]);
            break;

        case 'DELETE':
            $sql = "DELETE FROM servicos WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'error' => 'Método não permitido']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>