<?php
// Importa as classes do PHPMailer para o namespace global
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Carrega o autoloader do Composer
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * Função central para enviar e-mails usando PHPMailer.
 *
 * @param array $config As configurações do servidor SMTP.
 * @param string $destinatarioEmail O e-mail do destinatário.
 * @param string $destinatarioNome O nome do destinatário.
 * @param string $assunto O assunto do e-mail.
 * @param string $corpoHtml O corpo do e-mail em formato HTML.
 * @param string $corpoTexto O corpo alternativo em texto puro.
 * @return array Retorna ['success' => true] ou ['success' => false, 'message' => 'erro'].
 */
function enviarEmail(array $config, string $destinatarioEmail, string $destinatarioNome, string $assunto, string $corpoHtml, string $corpoTexto = '') {
    $mail = new PHPMailer(true); // Habilita exceções

    try {
        // Configurações do Servidor
        // $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Descomente para debug detalhado
        $mail->isSMTP();
        $mail->Host       = $config['smtp_host'];
        $mail->SMTPAuth   = (bool)$config['smtp_auth'];
        $mail->Username   = $config['smtp_user'];
        $mail->Password   = $config['smtp_pass'];
        $mail->SMTPSecure = $config['smtp_security'] === 'none' ? false : $config['smtp_security'];
        $mail->Port       = (int)$config['smtp_port'];
        $mail->CharSet    = 'UTF-8';

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
        return ['success' => false, 'message' => "A mensagem não pôde ser enviada. Erro: {$mail->ErrorInfo}"];
    }
}
?>