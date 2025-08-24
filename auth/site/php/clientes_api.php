<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'conexao.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;
$searchTerm = $_GET['search'] ?? null;

try {
    switch ($method) {
        case 'GET':
            // NOVA LÓGICA DE BUSCA: Se um termo de busca for fornecido
            if ($searchTerm) {
                $stmt = $pdo->prepare("SELECT * FROM clientes WHERE nome LIKE ? OR telefone LIKE ? OR email LIKE ? LIMIT 10");
                $stmt->execute(['%' . $searchTerm . '%', '%' . $searchTerm . '%', '%' . $searchTerm . '%']);
                echo json_encode($stmt->fetchAll());
            } 
            // Lógica antiga para buscar por ID
            elseif ($id) {
                $stmt = $pdo->prepare("SELECT * FROM clientes WHERE id = ?");
                $stmt->execute([$id]);
                echo json_encode($stmt->fetch());
            } 
            // Lógica antiga para buscar todos
            else {
                $stmt = $pdo->query("SELECT * FROM clientes ORDER BY nome ASC");
                echo json_encode($stmt->fetchAll());
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $sql = "INSERT INTO clientes (nome, cpf_cnpj, telefone, email, endereco) VALUES (?, ?, ?, ?, ?)";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['nome'], $data['cpf_cnpj'], $data['telefone'], $data['email'], $data['endereco']]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;
            
        case 'PUT':
            // O ideal aqui é receber JSON, mas mantendo o original para consistência
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$data) {
                 parse_str(file_get_contents("php://input"), $data);
            }
            $sql = "UPDATE clientes SET nome = ?, cpf_cnpj = ?, telefone = ?, email = ?, endereco = ? WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$data['nome'], $data['cpf_cnpj'], $data['telefone'], $data['email'], $data['endereco'], $id]);
            echo json_encode(['success' => true]);
            break;
            
        case 'DELETE':
            $sql = "DELETE FROM clientes WHERE id = ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            break;
            
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>