<?php
// Inicia o buffer de saída para capturar qualquer erro antes que seja impresso
ob_start();

header('Content-Type: application/json');
require_once 'conexao.php';
require_once 'email.php'; 

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Bloco try-catch principal para garantir que sempre retornemos JSON
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    // Permite sobrescrever o método (ex: PUT, DELETE) via POST
    if ($method == 'POST' && isset($input['_method'])) {
        $method = strtoupper($input['_method']);
    }

    // Determina o tipo de recurso que está sendo solicitado
    $tipo = $_GET['tipo'] ?? ($input['tipo'] ?? null);

    switch ($tipo) {
        case 'email_completo':
            handle_email_completo($pdo, $method, $input);
            break;

        // Adicionado o case para chamar a função de manipulação de usuários
        case 'usuarios':
            handle_usuarios($pdo, $method, $input, $_GET);
            break;

        default:
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Tipo de requisição inválido.']);
            break;
    }

} catch (Throwable $e) {
    // Se qualquer erro inesperado (Throwable) acontecer, ele será capturado aqui
    ob_clean(); // Limpa qualquer saída de erro que já tenha sido gerada
    http_response_code(500); // Erro interno do servidor
    echo json_encode([
        'success' => false,
        'message' => 'Ocorreu um erro interno no servidor.',
        'error' => $e->getMessage(), // Envia a mensagem de erro real para debug
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

// Limpa o buffer de saída no final da execução normal
ob_end_flush();


// As funções de e-mail permanecem as mesmas
function handle_email_completo($pdo, $method, $input) {
    $configFile = __DIR__ . '/../mail/email_config.json';
    $acao = $input['acao'] ?? null;

    if ($method == 'POST') {
        switch ($acao) {
            case 'testar_smtp':
                testar_conexao_smtp($input, $configFile);
                return;
            case 'enviar_teste_simples':
                enviar_email_teste_simples($input);
                return;
            case 'enviar_teste_real':
                enviar_email_teste_real($pdo, $input);
                return;
        }
    }

    if ($method == 'GET') {
        if (file_exists($configFile)) {
            $config = json_decode(file_get_contents($configFile), true) ?: [];
            // Verifica se a senha existe para não enviá-la, mas informar que ela está salva
            $config['smtp_pass_exists'] = !empty($config['smtp_password:']);
            unset($config['smtp_password:']);
            echo json_encode($config);
        } else {
            echo json_encode([]);
        }
    } 
    elseif ($method == 'PUT') {
        $configExistente = file_exists($configFile) ? json_decode(file_get_contents($configFile), true) : [];
        if (!is_array($configExistente)) $configExistente = [];

        $configParaSalvar = $input;

        // Se a senha não foi enviada no formulário, mantém a que já estava salva
        if (empty($input['smtp_pass']) && isset($configExistente['smtp_password:'])) {
            $configParaSalvar['smtp_password:'] = $configExistente['smtp_password:'];
        } else {
            $configParaSalvar['smtp_password:'] = $input['smtp_pass'];
        }

        unset($configParaSalvar['_method'], $configParaSalvar['tipo'], $configParaSalvar['smtp_pass'], $configParaSalvar['acao']);

        if (file_put_contents($configFile, json_encode($configParaSalvar, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
            echo json_encode(['success' => true, 'message' => 'Configurações de e-mail salvas com sucesso!']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Não foi possível salvar o arquivo de configuração. Verifique as permissões da pasta /mail.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido para este recurso.']);
    }
}


function testar_conexao_smtp($input, $configFile) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $input['smtp_host'];
        $mail->Port = (int)$input['smtp_port'];
        $mail->SMTPAuth = (bool)$input['smtp_auth'];
        $mail->Username = $input['smtp_user'];
        $mail->SMTPSecure = $input['smtp_security'] === 'none' ? '' : $input['smtp_security'];

        if (!empty($input['smtp_pass'])) {
            $mail->Password = $input['smtp_pass'];
        } elseif (file_exists($configFile)) {
            $configSalva = json_decode(file_get_contents($configFile), true);
            if (!empty($configSalva['smtp_password:'])) {
                $mail->Password = $configSalva['smtp_password:'];
            } else {
                throw new Exception("O campo de senha está vazio e não há senha salva para o teste.");
            }
        } else {
            throw new Exception("O campo de senha é obrigatório para o teste.");
        }

        if ($mail->smtpConnect()) {
            $mail->smtpClose();
            echo json_encode(['success' => true, 'message' => 'Conexão SMTP bem-sucedida!']);
        } else {
            throw new Exception("Falha ao conectar ao servidor SMTP. Verifique os dados.");
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Falha na conexão: " . $e->getMessage()]);
    }
}

function enviar_email_teste_simples($input) {
    if (empty($input['destinatario']) || !filter_var($input['destinatario'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Destinatário de e-mail inválido.']);
        return;
    }
    
    $resultado = enviarEmailTesteSimples(
        $input['destinatario'],
        $input['assunto'],
        $input['corpo']
    );

    if ($resultado['success']) {
        echo json_encode(['success' => true, 'message' => "E-mail de teste enviado com sucesso para {$input['destinatario']}!"]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $resultado['message']]);
    }
}

function enviar_email_teste_real($pdo, $input) {
    $os_id = $input['os_id'] ?? null;
    if (empty($os_id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID da Ordem de Serviço não fornecido.']);
        return;
    }

    $resultado = enviarEmailOS($pdo, $os_id);

    if ($resultado['success']) {
        echo json_encode(['success' => true, 'message' => $resultado['message']]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $resultado['message']]);
    }
}

/**
 * Manipula requisições relacionadas aos usuários (CRUD).
 * @param PDO $pdo Objeto de conexão com o banco.
 * @param string $method Método HTTP (GET, POST, PUT, DELETE).
 * @param array|null $input Dados do corpo da requisição (JSON decodificado).
 * @param array $get Array $_GET com os parâmetros da URL.
 */
function handle_usuarios($pdo, $method, $input, $get) {
    try {
        switch ($method) {
            case 'GET':
                // Busca um usuário específico
                if (isset($get['id'])) {
                    $stmt = $pdo->prepare("SELECT id, nome, email, telefone, endereco FROM usuarios WHERE id = ?");
                    $stmt->execute([$get['id']]);
                    $usuario = $stmt->fetch(PDO::FETCH_ASSOC);
                    echo json_encode($usuario ?: null);
                } 
                // Busca todos os usuários
                else {
                    $stmt = $pdo->query("SELECT id, nome, email, telefone, data_cadastro FROM usuarios ORDER BY nome");
                    $usuarios = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    echo json_encode($usuarios);
                }
                break;

            case 'POST':
                // Adiciona um novo usuário
                $sql = "INSERT INTO usuarios (nome, email, senha, telefone, endereco) VALUES (?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                // É crucial usar password_hash para segurança
                $senhaHash = password_hash($input['senha'], PASSWORD_DEFAULT);
                $stmt->execute([$input['nome'], $input['email'], $senhaHash, $input['telefone'], $input['endereco']]);
                echo json_encode(['success' => true, 'message' => 'Usuário adicionado com sucesso!']);
                break;

            case 'PUT':
                // Atualiza um usuário existente
                $sql = "UPDATE usuarios SET nome = ?, email = ?, telefone = ?, endereco = ?";
                $params = [$input['nome'], $input['email'], $input['telefone'], $input['endereco']];
                
                // Apenas atualiza a senha se uma nova for fornecida
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
                // Exclui um usuário
                $stmt = $pdo->prepare("DELETE FROM usuarios WHERE id = ?");
                // O ID para DELETE geralmente vem no corpo da requisição
                $stmt->execute([$input['id']]);
                echo json_encode(['success' => true, 'message' => 'Usuário excluído com sucesso!']);
                break;

            default:
                http_response_code(405); // Method Not Allowed
                echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
                break;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        // Verifica se é um erro de chave duplicada (email já existe)
        if ($e->getCode() == 23000) {
             echo json_encode(['success' => false, 'message' => 'Erro: O e-mail informado já está cadastrado.']);
        } else {
             echo json_encode(['success' => false, 'message' => 'Erro no banco de dados: ' . $e->getMessage()]);
        }
    }
}
?>