<?php
header('Content-Type: application/json');
require_once 'conexao.php'; // Inclui o script de conexão com o banco

// Simula um roteador de API simples
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Permite simular PUT e DELETE via POST
if ($method == 'POST' && isset($input['_method'])) {
    $method = strtoupper($input['_method']);
}

// Determina qual recurso está sendo solicitado (usuários, email, etc.)
$tipo = $_GET['tipo'] ?? ($input['tipo'] ?? null);

switch ($tipo) {
    case 'email':
        handle_email($pdo, $method, $input);
        break;
    case 'fila_email':
        handle_fila_email($pdo, $method, $input);
        break;
    case 'usuarios':
        handle_usuarios($pdo, $method, $input, $_GET);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Tipo de requisição inválido.']);
        break;
}

// ===================================================================
// FUNÇÕES HANDLER PARA CADA TIPO DE RECURSO
// ===================================================================

/**
 * Manipula requisições relacionadas às configurações de e-mail.
 */
function handle_email($pdo, $method, $input) {
    // Em um sistema real, isso estaria em uma tabela `configuracoes` no banco.
    $configFile = 'email_config.json';

    if ($method == 'GET') {
        if (file_exists($configFile)) {
            $config = json_decode(file_get_contents($configFile), true);
            echo json_encode($config);
        } else {
            echo json_encode([]); // Retorna objeto vazio se não houver config
        }
    } elseif ($method == 'PUT') {
        // A senha não é salva no arquivo por segurança.
        // Em um sistema real, a senha seria criptografada e salva no banco.
        unset($input['smtp_pass']); 
        unset($input['_method']);
        unset($input['tipo']);

        if (file_put_contents($configFile, json_encode($input, JSON_PRETTY_PRINT))) {
            echo json_encode(['success' => true, 'message' => 'Configurações de e-mail salvas com sucesso!']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Não foi possível salvar o arquivo de configuração. Verifique as permissões.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido para este recurso.']);
    }
}

/**
 * Manipula requisições relacionadas à fila de e-mails.
 */
function handle_fila_email($pdo, $method, $input) {
    if ($method == 'GET') {
        // Simulação de dados da fila de e-mails. No futuro, virá do banco.
        $fila = [
            ['id' => 1, 'destinatario' => 'cliente1@example.com', 'assunto' => 'Sua OS #123 foi atualizada', 'status' => 'pendente', 'ultima_tentativa' => '2023-10-27T10:00:00Z'],
            ['id' => 2, 'destinatario' => 'cliente2@example.com', 'assunto' => 'Orçamento do serviço', 'status' => 'falhou', 'ultima_tentativa' => '2023-10-27T09:30:00Z', 'erro' => 'SMTP connection failed'],
            ['id' => 3, 'destinatario' => 'admin@empresa.com', 'assunto' => 'Relatório diário', 'status' => 'enviado', 'ultima_tentativa' => '2023-10-26T18:00:00Z'],
        ];
        echo json_encode($fila);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido para este recurso.']);
    }
}

/**
 * Manipula requisições relacionadas aos usuários (código original adaptado).
 */
function handle_usuarios($pdo, $method, $input, $get) {
    try {
        switch ($method) {
            case 'GET':
                if (isset($get['id'])) {
                    $stmt = $pdo->prepare("SELECT id, nome, email, telefone, endereco FROM usuarios WHERE id = ?");
                    $stmt->execute([$get['id']]);
                    $usuario = $stmt->fetch();
                    echo json_encode($usuario);
                } else {
                    $stmt = $pdo->query("SELECT id, nome, email, telefone, data_cadastro FROM usuarios ORDER BY nome");
                    $usuarios = $stmt->fetchAll();
                    echo json_encode($usuarios);
                }
                break;

            case 'POST':
                $sql = "INSERT INTO usuarios (nome, email, senha, telefone, endereco) VALUES (?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $senhaHash = password_hash($input['senha'], PASSWORD_DEFAULT);
                $stmt->execute([$input['nome'], $input['email'], $senhaHash, $input['telefone'], $input['endereco']]);
                echo json_encode(['success' => true, 'message' => 'Usuário adicionado com sucesso!']);
                break;

            case 'PUT':
                $sql = "UPDATE usuarios SET nome = ?, email = ?, telefone = ?, endereco = ?";
                $params = [$input['nome'], $input['email'], $input['telefone'], $input['endereco']];
                if (!empty($input['senha'])) {
                    $sql .= ", senha = ?";
                    $params[] = password_hash($input['senha'], PASSWORD_DEFAULT);
                }
                $sql .= " WHERE id = ?";
                $params[] = $input['id'];
                
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                echo json_encode(['success' => true, 'message' => 'Usuário atualizado com sucesso!']);
                break;

            case 'DELETE':
                $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
                $stmt->execute([$input['id']]);
                echo json_encode(['success' => true, 'message' => 'Usuário excluído com sucesso!']);
                break;

            default:
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
                break;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        // Em produção, logar o erro em vez de exibi-lo
        echo json_encode(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
    }
}
?>