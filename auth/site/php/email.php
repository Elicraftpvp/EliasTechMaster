<?php
// Importa as classes do PHPMailer para o namespace global
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Carrega o autoloader do Composer. O caminho é relativo ao arquivo email.php
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Função central para enviar e-mails usando PHPMailer.
 * As configurações são lidas diretamente do arquivo /mail/email_config.json.
 *
 * @param string $destinatarioEmail O e-mail do destinatário.
 * @param string $destinatarioNome O nome do destinatário.
 * @param string $assunto O assunto do e-mail.
 * @param string $corpoHtml O corpo do e-mail em formato HTML.
 * @param string $corpoTexto O corpo alternativo em texto puro (opcional).
 * @return array Retorna ['success' => true] ou ['success' => false, 'message' => 'erro'].
 */
function enviarEmail(string $destinatarioEmail, string $destinatarioNome, string $assunto, string $corpoHtml, string $corpoTexto = '') {
    
    // 1. Localizar e carregar o arquivo de configuração JSON
    $configFile = __DIR__ . '/../mail/email_config.json';

    if (!file_exists($configFile)) {
        return ['success' => false, 'message' => 'Erro crítico: Arquivo de configuração de e-mail (email_config.json) não encontrado.'];
    }

    $configJson = file_get_contents($configFile);
    $config = json_decode($configJson, true);

    if ($config === null) {
        return ['success' => false, 'message' => 'Erro crítico: O arquivo de configuração de e-mail está mal formatado (JSON inválido).'];
    }

    // 2. Validar se as chaves essenciais existem no arquivo de configuração
    $requiredKeys = ['smtp_host', 'smtp_auth', 'smtp_user', 'smtp_port', 'smtp_security', 'smtp_from_email', 'smtp_from_name'];
    foreach ($requiredKeys as $key) {
        if (!isset($config[$key])) {
            return ['success' => false, 'message' => "Erro de configuração: A chave obrigatória '{$key}' não foi encontrada no email_config.json."];
        }
    }
    // A chave de senha no seu exemplo é "smtp_password:", vamos verificar por ela.
    if (!isset($config['smtp_password:'])) {
        return ['success' => false, 'message' => "Erro de configuração: A chave de senha 'smtp_password:' não foi encontrada no email_config.json."];
    }


    // 3. Iniciar e configurar o PHPMailer
    $mail = new PHPMailer(true); // Habilita exceções

    try {
        // Configurações do Servidor
        // $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Descomente para debug detalhado
        $mail->isSMTP();
        $mail->Host       = $config['smtp_host'];
        $mail->SMTPAuth   = (bool)$config['smtp_auth'];
        $mail->Username   = $config['smtp_user'];
        $mail->Password   = $config['smtp_password:']; // Usando a chave do arquivo JSON
        $mail->SMTPSecure = $config['smtp_security'] === 'none' ? '' : $config['smtp_security'];
        $mail->Port       = (int)$config['smtp_port'];
        $mail->CharSet    = 'UTF-8';
        $mail->Encoding   = 'base64';

        // Remetente e Destinatário
        $mail->setFrom($config['smtp_from_email'], $config['smtp_from_name']);
        $mail->addAddress($destinatarioEmail, $destinatarioNome);

        // Conteúdo
        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpoHtml;
        $mail->AltBody = $corpoTexto ?: strip_tags($corpoHtml);

        $mail->send();
        return ['success' => true, 'message' => 'E-mail enviado com sucesso!'];

    } catch (Exception $e) {
        // Retorna a mensagem de erro detalhada do PHPMailer
        return ['success' => false, 'message' => "A mensagem não pôde ser enviada. Erro do servidor: {$mail->ErrorInfo}"];
    }
}
?>