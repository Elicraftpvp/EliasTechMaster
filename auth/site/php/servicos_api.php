<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'conexao.php'; // Certifique-se que este arquivo existe e está correto

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

// Helper para garantir que o tipo seja válido
function getValidType($type) {
    $validTypes = ['servico', 'desconto_percentual', 'desconto_fixo'];
    return in_array($type, $validTypes) ? $type : 'servico';
}

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT id, nome, descricao, valor, tipo FROM servicos WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
            } else {
                // Adicionado 'tipo' na consulta
                $stmt = $pdo->query("SELECT id, nome, descricao, valor, tipo FROM servicos ORDER BY nome ASC");
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $tipo = getValidType($data['tipo'] ?? 'servico');
            
            // Adicionado 'tipo' no INSERT
            $sql = "INSERT INTO servicos (nome, descricao, valor, tipo) VALUES (?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['nome'], $data['descricao'], (float)$data['valor'], $tipo]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        case 'PUT':
            // Para PUT, os dados vêm de forma diferente, então usamos json_decode também
            $data = json_decode(file_get_contents('php://input'), true);
            $tipo = getValidType($data['tipo'] ?? 'servico');
            
            // Adicionado 'tipo' no UPDATE
            $sql = "UPDATE servicos SET nome = ?, descricao = ?, valor = ?, tipo = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['nome'], $data['descricao'], (float)$data['valor'], $tipo, $id]);
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