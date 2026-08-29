<?php
// Habilita a exibição de erros para depuração
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Inclui o arquivo de conexão com o banco de dados
require 'conexao.php'; 

// Define o cabeçalho da resposta como JSON
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    // Rota GET: Listar usuários para o modal de esqueci senha
    if ($method === 'GET') {
        $acao = $_GET['acao'] ?? '';
        if ($acao === 'listar_usuarios') {
            $stmt = $pdo->query("SELECT id, nome, email FROM usuarios ORDER BY nome ASC");
            echo json_encode(['success' => true, 'usuarios' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => 'Ação inválida.']);
        exit;
    }

    // Rota POST: Login ou Reset de Senha
    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

        // AÇÃO: Redefinição direta de senha (Esqueci Minha Senha)
        if (isset($data['acao']) && $data['acao'] === 'reset_senha') {
            $usuarioId = $data['usuario_id'] ?? null;
            $novaSenha = $data['nova_senha'] ?? '';

            if (empty($usuarioId) || empty($novaSenha)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Selecione um usuário e informe a nova senha.']);
                exit;
            }

            // Atualiza a senha do usuário selecionado
            $stmt = $pdo->prepare("UPDATE usuarios SET senha = ? WHERE id = ?");
            $stmt->execute([$novaSenha, $usuarioId]);

            // Busca os dados do usuário para retornar
            $stmtUser = $pdo->prepare("SELECT id, nome, email FROM usuarios WHERE id = ?");
            $stmtUser->execute([$usuarioId]);
            $user = $stmtUser->fetch(PDO::FETCH_ASSOC);

            echo json_encode([
                'success' => true,
                'message' => 'Senha alterada com sucesso!',
                'usuario' => $user
            ]);
            exit;
        }

        // AÇÃO: Login Padrão
        if (!isset($data['email']) || !isset($data['senha'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Email e senha são obrigatórios.']);
            exit;
        }

        $email = trim($data['email']);
        $senha = $data['senha'];

        // Prepara a consulta para buscar o usuário pelo email
        $stmt = $pdo->prepare("SELECT * FROM usuarios WHERE email = ?");
        $stmt->execute([$email]);
        $usuario = $stmt->fetch(PDO::FETCH_ASSOC);

        // Verifica se o usuário foi encontrado e se a senha corresponde (texto puro ou hash)
        if ($usuario && ($senha === $usuario['senha'] || password_verify($senha, $usuario['senha']))) {
            unset($usuario['senha']);

            echo json_encode([
                'success' => true,
                'message' => 'Login bem-sucedido!',
                'usuario' => $usuario
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['error' => 'Email ou senha inválidos.']);
        }
        exit;
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>