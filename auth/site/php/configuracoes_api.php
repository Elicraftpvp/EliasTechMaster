<?php
header('Content-Type: application/json');
require_once 'conexao.php';
require_once 'email.php'; // Usa a nova versão que lê o JSON internamente

// Importa as classes do PHPMailer para usar na função de teste de conexão
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Simula um roteador de API simples
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Permite simular PUT e DELETE via POST
if ($method == 'POST' && isset($input['_method'])) {
    $method = strtoupper($input['_method']);
}

// Determina qual recurso está sendo solicitado
$tipo = $_GET['tipo'] ?? ($input['tipo'] ?? null);
$acao = $input['acao'] ?? null;

switch ($tipo) {
    // A nova interface vai pedir 'email_completo'
    case 'email_completo':
        handle_email_completo($pdo, $method, $input, $acao);
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
 * Manipula requisições relacionadas a TODAS as configurações de e-mail (servidor + template).
 */
function handle_email_completo($pdo, $method, $input, $acao) {
    $configFile = __DIR__ . '/../mail/email_config.json';

    // Rota para ações específicas via POST
    if ($method == 'POST') {
        switch ($acao) {
            case 'testar_smtp':
                testar_conexao_smtp($input, $configFile);
                return;
            case 'enviar_teste':
                enviar_email_de_teste($input);
                return;
        }
    }

    // Rota para obter as configurações
    if ($method == 'GET') {
        $config = []; // Inicia com um array vazio por padrão

        if (file_exists($configFile)) {
            $configJson = file_get_contents($configFile);
            $decodedConfig = json_decode($configJson, true);

            // *** A CORREÇÃO ESTÁ AQUI ***
            // Verifica se o JSON foi decodificado corretamente para um array
            if (is_array($decodedConfig)) {
                $config = $decodedConfig;
            }
        }

        // Agora, $config é garantido como um array, mesmo que o arquivo esteja vazio ou corrompido
        $config['smtp_pass_exists'] = isset($config['smtp_password:']) && !empty($config['smtp_password:']);
        unset($config['smtp_password:']); // Nunca envie a senha para o cliente
        
        echo json_encode($config);
        
    } 
    // Rota para salvar as configurações
    elseif ($method == 'PUT') {
        // ... (o código do PUT está correto e pode permanecer o mesmo)
        $configExistente = [];
        if (file_exists($configFile)) {
            $configExistente = json_decode(file_get_contents($configFile), true);
            // Adiciona a mesma verificação por segurança
            if (!is_array($configExistente)) {
                $configExistente = [];
            }
        }

        $configParaSalvar = $input;

        if (empty($input['smtp_pass'])) {
            if (isset($configExistente['smtp_password:'])) {
                $configParaSalvar['smtp_password:'] = $configExistente['smtp_password:'];
            }
        } else {
            $configParaSalvar['smtp_password:'] = $input['smtp_pass'];
        }

        unset($configParaSalvar['_method'], $configParaSalvar['tipo'], $configParaSalvar['smtp_pass']);

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

/**
 * Testa a conexão SMTP usando os dados fornecidos, sem enviar e-mail.
 */
function testar_conexao_smtp($input, $configFile) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $input['smtp_host'];
        $mail->Port = (int)$input['smtp_port'];
        $mail->SMTPAuth = (bool)$input['smtp_auth'];
        $mail->Username = $input['smtp_user'];
        $mail->SMTPSecure = $input['smtp_security'] === 'none' ? '' : $input['smtp_security'];

        // Se o usuário não digitou uma senha para o teste, tenta usar a que já está salva
        if (!empty($input['smtp_pass'])) {
            $mail->Password = $input['smtp_pass'];
        } elseif (file_exists($configFile)) {
            $configSalva = json_decode(file_get_contents($configFile), true);
            if (isset($configSalva['smtp_password:'])) {
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
            // Este else pode não ser alcançado se smtpConnect() lançar exceção
            throw new Exception("Falha ao conectar ao servidor SMTP.");
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Falha na conexão: " . $e->getMessage()]);
    }
}

/**
 * Envia um e-mail de teste real usando a função `enviarEmail`.
 */
function enviar_email_de_teste($input) {
    $destinatarioEmail = $input['destinatario'];
    if (empty($destinatarioEmail) || !filter_var($destinatarioEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Destinatário de e-mail inválido.']);
        return;
    }
    
    $destinatarioNome = 'Usuário de Teste';
    
    // Substitui as tags por valores de exemplo
    $assunto = str_replace(
        ['(N_OS_tag)', '(Nome_cliente_tag)', '(Status_OS_tag)', '(Data_Abertura_tag)'],
        ['999', 'Cliente de Teste', 'Em Andamento', date('d/m/Y')],
        $input['assunto']
    );

    $corpoHtml = nl2br(htmlspecialchars(str_replace(
        ['(N_OS_tag)', '(Nome_cliente_tag)', '(Status_OS_tag)', '(Data_Abertura_tag)'],
        ['999', 'Cliente de Teste', 'Em Andamento', date('d/m/Y')],
        $input['corpo']
    )));

    // Chama a função global de envio de e-mail
    $resultado = enviarEmail($destinatarioEmail, $destinatarioNome, $assunto, $corpoHtml);

    if ($resultado['success']) {
        echo json_encode(['success' => true, 'message' => "E-mail de teste enviado com sucesso para {$destinatarioEmail}!"]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $resultado['message']]);
    }
}


/**
 * Manipula requisições relacionadas à fila de e-mails.
 */
function handle_fila_email($pdo, $method, $input) {
    // (código existente sem alterações)
    if ($method == 'GET') {
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
 * Manipula requisições relacionadas aos usuários.
 */
function handle_usuarios($pdo, $method, $input, $get) {
    // (código existente sem alterações)
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
        echo json_encode(['success' => false, 'message' => 'Erro no servidor: ' . $e->getMessage()]);
    }
}
?>