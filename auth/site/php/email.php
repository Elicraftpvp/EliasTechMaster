<?php
// Importa as classes do PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Carrega o autoloader do Composer
require_once __DIR__ . '/../vendor/autoload.php';

// (A função carregarConfigSmtp permanece a mesma)
function carregarConfigSmtp() {
    $configFile = __DIR__ . '/../mail/email_config.json';
    if (!file_exists($configFile)) {
        return 'Erro crítico: Arquivo de configuração de e-mail (email_config.json) não encontrado.';
    }
    $config = json_decode(file_get_contents($configFile), true);
    if ($config === null) {
        return 'Erro crítico: O arquivo de configuração de e-mail está mal formatado (JSON inválido).';
    }
    $requiredKeys = ['smtp_host', 'smtp_user', 'smtp_port', 'smtp_password:'];
    foreach ($requiredKeys as $key) {
        if (empty($config[$key])) {
            return "Erro de configuração: A chave obrigatória '{$key}' está vazia ou não foi encontrada no email_config.json.";
        }
    }
    return $config;
}

/**
 * Envia um e-mail de teste simples com dados de exemplo.
 */
function enviarEmailTesteSimples(string $destinatarioEmail, string $assuntoTemplate, string $corpoTemplate) {
    $config = carregarConfigSmtp();
    if (is_string($config)) {
        return ['success' => false, 'message' => $config];
    }

    // MODIFICADO: Adicionada a nova tag à lista de substituição
    $tagsParaBuscar = ['(N_OS_tag)', '(Nome_cliente_tag)', '(Status_OS_tag)', '(equipamento_OS_tag)'];
    $valoresParaSubstituir = ['999', 'Cliente de Teste', 'Em Andamento', 'Desktop de Exemplo (i5/8GB RAM)'];

    $assunto = str_replace($tagsParaBuscar, $valoresParaSubstituir, $assuntoTemplate);
    $corpoHtml = nl2br(htmlspecialchars(str_replace($tagsParaBuscar, $valoresParaSubstituir, $corpoTemplate)));
    
    $remetenteNome = $config['smtp_from_name'] ?? 'Equipe de Suporte';
    return enviarEmailPHPMailer($config, $destinatarioEmail, 'Usuário de Teste', $assunto, $corpoHtml, $remetenteNome);
}


/**
 * Envia um e-mail real baseado nos dados de uma Ordem de Serviço.
 */
function enviarEmailOS(PDO $pdo, int $os_id) {
    $config = carregarConfigSmtp();
    if (is_string($config)) {
        return ['success' => false, 'message' => $config];
    }

    $dadosOS = null;
    try {
        // MODIFICADO: Adicionado 'os.equipamento' à consulta SQL
        $stmt = $pdo->prepare("SELECT os.id, os.status, os.equipamento, c.nome as cliente_nome, c.email as cliente_email 
                               FROM ordens_servico os 
                               JOIN clientes c ON os.cliente_id = c.id 
                               WHERE os.id = ?");
        $stmt->execute([$os_id]);
        $dadosOS = $stmt->fetch(PDO::FETCH_ASSOC);

    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Erro ao consultar o banco de dados: ' . $e->getMessage()];
    }

    if (!$dadosOS) {
        return ['success' => false, 'message' => "Ordem de Serviço com ID {$os_id} não encontrada."];
    }
    if (empty($dadosOS['cliente_email']) || !filter_var($dadosOS['cliente_email'], FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => "O cliente '{$dadosOS['cliente_nome']}' não possui um e-mail válido cadastrado."];
    }

    $assuntoTemplate = $config['email_subject_template'] ?? 'OS: (N_OS_tag)';
    $corpoTemplate = $config['email_body_template'] ?? 'Status da sua OS: (Status_OS_tag)';

    // MODIFICADO: Adicionada a nova tag ao array de substituição
    $tags = [
        '(N_OS_tag)'           => $dadosOS['id'],
        '(Nome_cliente_tag)'   => $dadosOS['cliente_nome'],
        '(Status_OS_tag)'      => $dadosOS['status'],
        '(equipamento_OS_tag)' => $dadosOS['equipamento'], // ADICIONADO
    ];
    $assunto = str_replace(array_keys($tags), array_values($tags), $assuntoTemplate);
    $corpoHtml = nl2br(htmlspecialchars(str_replace(array_keys($tags), array_values($tags), $corpoTemplate)));
    
    $remetenteNome = $config['smtp_from_name'] ?? 'Equipe de Suporte';

    $resultado = enviarEmailPHPMailer($config, $dadosOS['cliente_email'], $dadosOS['cliente_nome'], $assunto, $corpoHtml, $remetenteNome);
    
    if($resultado['success']) {
        $resultado['message'] = "E-mail de teste real enviado com sucesso para {$dadosOS['cliente_email']}!";
    }
    
    return $resultado;
}


/**
 * Função central que efetivamente envia o e-mail usando PHPMailer.
 * (Esta função não precisa de alterações)
 */
function enviarEmailPHPMailer(array $config, string $destinatarioEmail, string $destinatarioNome, string $assunto, string $corpoHtml, string $remetenteNome) {
    $mail = new PHPMailer(true);
    try {
        // $mail->SMTPDebug = SMTP::DEBUG_SERVER;
        $mail->isSMTP();
        $mail->Host       = $config['smtp_host'];
        $mail->SMTPAuth   = isset($config['smtp_auth']) ? (bool)$config['smtp_auth'] : true;
        $mail->Username   = $config['smtp_user'];
        $mail->Password   = $config['smtp_password:'];
        $mail->SMTPSecure = $config['smtp_security'] ?? PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)$config['smtp_port'];
        $mail->CharSet    = 'UTF-8';
        $mail->Encoding   = 'base64';
        $mail->setFrom($config['smtp_user'], $remetenteNome);
        $mail->addAddress($destinatarioEmail, $destinatarioNome);
        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpoHtml;
        $mail->AltBody = strip_tags($corpoHtml);
        $mail->send();
        return ['success' => true, 'message' => 'E-mail enviado com sucesso!'];
    } catch (Exception $e) {
        return ['success' => false, 'message' => "A mensagem não pôde ser enviada. Erro do servidor: {$mail->ErrorInfo}"];
    }
}
?>