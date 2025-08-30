<?php
header('Content-Type: application/json');
require_once 'conexao.php'; // Essencial para buscar dados da OS
require_once 'email.php';   // Onde a lógica de envio de email reside

// Importa as classes do PHPMailer para usar na função de teste de conexão
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Roteador de API
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

if ($method == 'POST' && isset($input['_method'])) {
    $method = strtoupper($input['_method']);
}

$tipo = $_GET['tipo'] ?? ($input['tipo'] ?? null);

// O roteamento principal agora verifica o 'tipo'
switch ($tipo) {
    case 'email_completo':
        handle_email_completo($pdo, $method, $input);
        break;
    // Outros cases como 'fila_email', 'usuarios' podem continuar aqui...
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Tipo de requisição inválido.']);
        break;
}

/**
 * Manipula todas as requisições para a rota 'email_completo'.
 */
function handle_email_completo($pdo, $method, $input) {
    $configFile = __DIR__ . '/../mail/email_config.json';
    $acao = $input['acao'] ?? null;

    // Roteamento de ações específicas via POST
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

    // GET para carregar configurações
    if ($method == 'GET') {
        if (file_exists($configFile)) {
            $config = json_decode(file_get_contents($configFile), true) ?: [];
            $config['smtp_pass_exists'] = !empty($config['smtp_password:']);
            unset($config['smtp_password:']);
            echo json_encode($config);
        } else {
            echo json_encode([]);
        }
    } 
    // PUT (via POST com _method) para salvar
    elseif ($method == 'PUT') {
        $configExistente = file_exists($configFile) ? json_decode(file_get_contents($configFile), true) : [];
        if (!is_array($configExistente)) $configExistente = [];

        $configParaSalvar = $input;

        // Mantém a senha existente se o campo vier vazio
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

/**
 * Testa a conexão SMTP.
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

/**
 * Envia um e-mail de teste simples com dados de exemplo.
 */
function enviar_email_teste_simples($input) {
    if (empty($input['destinatario']) || !filter_var($input['destinatario'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Destinatário de e-mail inválido.']);
        return;
    }
    
    // Chama a função de envio do email.php, passando os dados necessários
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

/**
 * Envia um e-mail de teste real baseado em uma OS.
 */
function enviar_email_teste_real($pdo, $input) {
    $os_id = $input['os_id'] ?? null;
    if (empty($os_id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID da Ordem de Serviço não fornecido.']);
        return;
    }

    // Chama a função de envio do email.php, passando a conexão PDO e o ID da OS
    $resultado = enviarEmailOS($pdo, $os_id);

    if ($resultado['success']) {
        echo json_encode(['success' => true, 'message' => $resultado['message']]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $resultado['message']]);
    }
}
?>