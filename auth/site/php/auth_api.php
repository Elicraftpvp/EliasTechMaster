<?php
// Habilita a exibição de erros para depuração
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Inclui o arquivo de conexão com o banco de dados
require 'conexao.php'; 

// Define o cabeçalho da resposta como JSON
header('Content-Type: application/json');

// Garante que o método da requisição seja POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Método não permitido
    echo json_encode(['error' => 'Método não permitido. Use POST.']);
    exit;
}

// Pega os dados enviados no corpo da requisição (JSON)
$data = json_decode(file_get_contents('php://input'), true);

// Validação básica dos dados recebidos
if (!isset($data['email']) || !isset($data['senha'])) {
    http_response_code(400); // Requisição inválida
    echo json_encode(['error' => 'Email e senha são obrigatórios.']);
    exit;
}

$email = $data['email'];
$senha = $data['senha'];

try {
    // Prepara a consulta para buscar o usuário pelo email
    $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

    // Verifica se o usuário foi encontrado e se a senha corresponde
    if ($usuario && $senha === $usuario['senha']) {
        // ATENÇÃO: Comparar senhas em texto puro é EXTREMAMENTE INSEGURO.
        // Em um sistema de produção, use password_hash() para salvar a senha
        // e password_verify() para comparar.
        // Ex: if ($usuario && password_verify($senha, $usuario['senha'])) { ... }

        // Remove o campo da senha da resposta por segurança
        unset($usuario['senha']);

        // Responde com sucesso e os dados do usuário
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Login bem-sucedido!',
            'usuario' => $usuario
        ]);

    } else {
        // Se o usuário não for encontrado ou a senha estiver incorreta
        http_response_code(401); // Não autorizado
        echo json_encode(['error' => 'Email ou senha inválidos.']);
    }

} catch (PDOException $e) {
    // Em caso de erro no banco de dados
    http_response_code(500); // Erro interno do servidor
    echo json_encode(['error' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>