<?php
// Importa as classes do PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Carrega o autoloader do Composer
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Carrega e valida a configuração SMTP do arquivo JSON.
 * Função auxiliar para evitar repetição de código.
 *
 * @return array|string Retorna o array de configuração ou uma string de erro.
 */
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
 *
 * @param string $destinatarioEmail E-mail do destinatário do teste.
 * @param string $assuntoTemplate O template do assunto.
 * @param string $corpoTemplate O template do corpo do e-mail.
 * @return array Retorna ['success' => true] ou ['success' => false, 'message' => 'erro'].
 */
function enviarEmailTesteSimples(string $destinatarioEmail, string $assuntoTemplate, string $corpoTemplate) {
    $config = carregarConfigSmtp();
    if (is_string($config)) {
        return ['success' => false, 'message' => $config];
    }

    // Substitui as tags por valores de exemplo
    $assunto = str_replace(
        ['(N_OS_tag)', '(Nome_cliente_tag)', '(Status_OS_tag)', '(Data_Abertura_tag)'],
        ['999', 'Cliente de Teste', 'Em Andamento', date('d/m/Y')],
        $assuntoTemplate
    );

    $corpoHtml = nl2br(htmlspecialchars(str_replace(
        ['(N_OS_tag)', '(Nome_cliente_tag)', '(Status_OS_tag)', '(Data_Abertura_tag)'],
        ['999', 'Cliente de Teste', 'Em Andamento', date('d/m/Y')],
        $corpoTemplate
    )));

    // O nome do remetente (From) pode ser configurado no JSON também
    $remetenteNome = $config['smtp_from_name'] ?? 'Equipe de Suporte';

    return enviarEmailPHPMailer($config, $destinatarioEmail, 'Usuário de Teste', $assunto, $corpoHtml, $remetenteNome);
}


/**
 * Envia um e-mail real baseado nos dados de uma Ordem de Serviço.
 *
 * @param PDO $pdo A instância da conexão com o banco de dados.
 * @param int $os_id O ID da Ordem de Serviço.
 * @return array Retorna ['success' => true] ou ['success' => false, 'message' => 'erro'].
 */
function enviarEmailOS(PDO $pdo, int $os_id) {
    $config = carregarConfigSmtp();
    if (is_string($config)) {
        return ['success' => false, 'message' => $config];
    }

    // 1. Buscar dados da OS e do Cliente no banco de dados
    $stmt = $pdo->prepare("SELECT os.id, os.status, os.data_abertura, c.nome as cliente_nome, c.email as cliente_email 
                           FROM ordens_servico os 
                           JOIN clientes c ON os.cliente_id = c.id 
                           WHERE os.id = ?");
    $stmt->execute([$os_id]);
    $dadosOS = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dadosOS) {
        return ['success' => false, 'message' => "Ordem de Serviço com ID {$os_id} não encontrada."];
    }
    if (empty($dadosOS['cliente_email']) || !filter_var($dadosOS['cliente_email'], FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => "O cliente {$dadosOS['cliente_nome']} não possui um e-mail válido cadastrado."];
    }

    // 2. Pegar os templates do arquivo de configuração
    $assuntoTemplate = $config['email_subject_template'] ?? 'OS: (N_OS_tag)';
    $corpoTemplate = $config['email_body_template'] ?? 'Status da sua OS: (Status_OS_tag)';

    // 3. Substituir as tags com os dados reais do banco
    $tags = [
        '(N_OS_tag)'          => $dadosOS['id'],
        '(Nome_cliente_tag)'  => $dadosOS['cliente_nome'],
        '(Status_OS_tag)'     => $dadosOS['status'],
        '(Data_Abertura_tag)' => date('d/m/Y H:i', strtotime($dadosOS['data_abertura']))
    ];
    $assunto = str_replace(array_keys($tags), array_values($tags), $assuntoTemplate);
    $corpoHtml = nl2br(htmlspecialchars(str_replace(array_keys($tags), array_values($tags), $corpoTemplate)));
    
    $remetenteNome = $config['smtp_from_name'] ?? 'Equipe de Suporte';

    // 4. Enviar o e-mail
    $resultado = enviarEmailPHPMailer($config, $dadosOS['cliente_email'], $dadosOS['cliente_nome'], $assunto, $corpoHtml, $remetenteNome);
    
    if($resultado['success']) {
        // Adiciona o destinatário na mensagem de sucesso para clareza
        $resultado['message'] = "E-mail de teste real enviado com sucesso para {$dadosOS['cliente_email']}!";
    }
    
    return $resultado;
}


/**
 * Função central e genérica que efetivamente envia o e-mail usando PHPMailer.
 *
 * @param array $config Configurações do SMTP.
 * @param string $destinatarioEmail E-mail do destinatário.
 * @param string $destinatarioNome Nome do destinatário.
 * @param string $assunto Assunto final do e-mail.
 * @param string $corpoHtml Corpo final do e-mail em HTML.
 * @param string $remetenteNome Nome que aparecerá como remetente.
 * @return array Retorna o status do envio.
 */
function enviarEmailPHPMailer(array $config, string $destinatarioEmail, string $destinatarioNome, string $assunto, string $corpoHtml, string $remetenteNome) {
    $mail = new PHPMailer(true);

    try {
        // Configurações do Servidor
        // $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Descomente para debug detalhado
        $mail->isSMTP();
        $mail->Host       = $config['smtp_host'];
        $mail->SMTPAuth   = isset($config['smtp_auth']) ? (bool)$config['smtp_auth'] : true;
        $mail->Username   = $config['smtp_user'];
        $mail->Password   = $config['smtp_password:'];
        $mail->SMTPSecure = $config['smtp_security'] ?? PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)$config['smtp_port'];
        $mail->CharSet    = 'UTF-8';
        $mail->Encoding   = 'base64';

        // Remetente e Destinatário
        $mail->setFrom($config['smtp_user'], $remetenteNome); // O e-mail do remetente geralmente é o mesmo do usuário de login
        $mail->addAddress($destinatarioEmail, $destinatarioNome);

        // Conteúdo
        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpoHtml;
        $mail->AltBody = strip_tags($corpoHtml);

        $mail->send();
        return ['success' => true, 'message' => 'E-mail enviado com sucesso!'];

    } catch (Exception $e) {
        // Retorna a mensagem de erro detalhada do PHPMailer
        return ['success' => false, 'message' => "A mensagem não pôde ser enviada. Erro do servidor: {$mail->ErrorInfo}"];
    }
}
?>