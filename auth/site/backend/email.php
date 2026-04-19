<?php
// Importa as classes do PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Carrega o autoloader do Composer
require_once __DIR__ . '/../vendor/autoload.php';
// Inclui nossa nova biblioteca de PDF
require_once __DIR__ . '/gerar_pdf.php';

// (As funções carregarConfigSmtp e enviarEmailTesteSimples permanecem as mesmas)
function carregarConfigSmtp() {
    $configFile = __DIR__ . '/../mail/email_config.json';
    if (!file_exists($configFile)) return 'Erro: email_config.json não encontrado.';
    $config = json_decode(file_get_contents($configFile), true);
    if ($config === null) return 'Erro: email_config.json mal formatado.';
    $requiredKeys = ['smtp_host', 'smtp_user', 'smtp_port', 'smtp_password:'];
    foreach ($requiredKeys as $key) {
        if (empty($config[$key])) return "Erro: A chave '{$key}' está faltando no email_config.json.";
    }
    return $config;
}
function enviarEmailTesteSimples(string $destinatarioEmail, string $assuntoTemplate, string $corpoTemplate) {
    $config = carregarConfigSmtp();
    if (is_string($config)) return ['success' => false, 'message' => $config];
    $tagsParaBuscar = ['(N_OS_tag)', '(Nome_cliente_tag)', '(Status_OS_tag)', '(equipamento_OS_tag)'];
    $valoresParaSubstituir = ['999', 'Cliente de Teste', 'Em Andamento', 'Desktop de Exemplo (i5/8GB RAM)'];
    $assunto = str_replace($tagsParaBuscar, $valoresParaSubstituir, $assuntoTemplate);
    $corpoHtml = nl2br(htmlspecialchars(str_replace($tagsParaBuscar, $valoresParaSubstituir, $corpoTemplate)));
    $remetenteNome = $config['smtp_from_name'] ?? 'Equipe de Suporte';
    return enviarEmailPHPMailer($config, $destinatarioEmail, 'Usuário de Teste', $assunto, $corpoHtml, $remetenteNome);
}


/**
 * NOVA FUNÇÃO: Orquestra o envio de e-mail de uma OS com o PDF anexado.
 *
 * @param PDO $pdo A conexão com o banco de dados.
 * @param int $os_id O ID da Ordem de Serviço.
 * @return array Retorna o status do envio.
 */
function enviarEmailOsComAnexo(PDO $pdo, int $os_id): array
{
    // 1. Gera o PDF em memória
    $pdfData = gerarPdfParaAnexo($pdo, $os_id);
    if (!$pdfData) {
        return ['success' => false, 'message' => "Falha ao gerar o PDF para a OS #{$os_id}."];
    }

    // 2. Chama a função de envio de e-mail, passando os dados do anexo
    return enviarEmailOS($pdo, $os_id, $pdfData['content'], $pdfData['filename']);
}


/**
 * Função MODIFICADA para opcionalmente receber um anexo.
 */
function enviarEmailOS(PDO $pdo, int $os_id, ?string $attachmentContent = null, ?string $attachmentFilename = null): array
{
    $config = carregarConfigSmtp();
    if (is_string($config)) {
        return ['success' => false, 'message' => $config];
    }

    $dadosOS = null;
    try {
        $stmt = $pdo->prepare("SELECT os.id, os.status, os.equipamento, c.nome as cliente_nome, c.email as cliente_email FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE os.id = ?");
        $stmt->execute([$os_id]);
        $dadosOS = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        return ['success' => false, 'message' => 'Erro ao consultar o banco de dados: ' . $e->getMessage()];
    }

    if (!$dadosOS) return ['success' => false, 'message' => "OS #{$os_id} não encontrada."];
    if (empty($dadosOS['cliente_email']) || !filter_var($dadosOS['cliente_email'], FILTER_VALIDATE_EMAIL)) {
        return ['success' => false, 'message' => "O cliente '{$dadosOS['cliente_nome']}' não possui um e-mail válido."];
    }

    $assuntoTemplate = $config['email_subject_template'] ?? 'OS: (N_OS_tag)';
    $corpoTemplate = $config['email_body_template'] ?? 'Status da sua OS: (Status_OS_tag)';
    $tags = [
        '(N_OS_tag)' => $dadosOS['id'],
        '(Nome_cliente_tag)' => $dadosOS['cliente_nome'],
        '(Status_OS_tag)' => $dadosOS['status'],
        '(equipamento_OS_tag)' => $dadosOS['equipamento'],
    ];
    $assunto = str_replace(array_keys($tags), array_values($tags), $assuntoTemplate);
    $corpoHtml = nl2br(htmlspecialchars(str_replace(array_keys($tags), array_values($tags), $corpoTemplate)));
    $remetenteNome = $config['smtp_from_name'] ?? 'Equipe de Suporte';

    return enviarEmailPHPMailer($config, $dadosOS['cliente_email'], $dadosOS['cliente_nome'], $assunto, $corpoHtml, $remetenteNome, $attachmentContent, $attachmentFilename);
}


/**
 * Função central MODIFICADA para aceitar anexos.
 */
function enviarEmailPHPMailer(array $config, string $destinatarioEmail, string $destinatarioNome, string $assunto, string $corpoHtml, string $remetenteNome, ?string $attachmentContent = null, ?string $attachmentFilename = null): array
{
    $mail = new PHPMailer(true);
    try {
        // Configurações do Servidor
        $mail->isSMTP();
        $mail->Host       = $config['smtp_host'];
        $mail->SMTPAuth   = isset($config['smtp_auth']) ? (bool)$config['smtp_auth'] : true;
        $mail->Username   = $config['smtp_user'];
        $mail->Password   = $config['smtp_password:'];
        $mail->SMTPSecure = $config['smtp_security'] ?? PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = (int)$config['smtp_port'];
        $mail->CharSet    = 'UTF-8';

        // Remetente e Destinatário
        $mail->setFrom($config['smtp_user'], $remetenteNome);
        $mail->addAddress($destinatarioEmail, $destinatarioNome);

        // Anexo (NOVO)
        if ($attachmentContent && $attachmentFilename) {
            $mail->addStringAttachment($attachmentContent, $attachmentFilename);
        }

        // Conteúdo
        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpoHtml;
        $mail->AltBody = strip_tags($corpoHtml);

        $mail->send();
        return ['success' => true, 'message' => 'E-mail enviado com sucesso!'];

    } catch (Exception $e) {
        return ['success' => false, 'message' => "A mensagem não pôde ser enviada. Erro: {$mail->ErrorInfo}"];
    }
}
?>