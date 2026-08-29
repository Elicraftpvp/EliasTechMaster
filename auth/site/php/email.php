<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
}
require_once __DIR__ . '/gerar_pdf.php';

function carregarConfigSmtp(?PDO $pdo = null) {
    if (!$pdo) {
        require __DIR__ . '/conexao.php';
    }
    
    $stmt = $pdo->query("SELECT chave, valor FROM configuracoes");
    $configs = $stmt->fetchAll(PDO::FETCH_KEY_PAIR) ?: [];
    
    if (empty($configs['smtp_host'])) return 'Erro: Servidor SMTP não configurado no banco de dados.';
    if (empty($configs['smtp_user'])) return 'Erro: Usuário SMTP não configurado.';
    if (empty($configs['smtp_port'])) return 'Erro: Porta SMTP não configurada.';
    if (empty($configs['smtp_pass'])) return 'Erro: Senha do SMTP não configurada.';

    return [
        'smtp_host' => $configs['smtp_host'] ?? '',
        'smtp_user' => $configs['smtp_user'] ?? '',
        'smtp_port' => (int)($configs['smtp_port'] ?? 587),
        'smtp_password:' => $configs['smtp_pass'] ?? '',
        'smtp_pass' => $configs['smtp_pass'] ?? '',
        'smtp_security' => $configs['smtp_security'] ?? 'tls',
        'smtp_auth' => ($configs['smtp_auth'] ?? '1') === '1',
        'smtp_from_name' => $configs['nfse_empresa_nome'] ?? 'Elias TechMaster',
        'email_subject_template' => $configs['email_subject_template'] ?? 'OS: (N_OS_tag) - Cliente: (Nome_cliente_tag)',
        'email_body_template' => $configs['email_body_template'] ?? "Olá (Nome_cliente_tag),\n\nSua Ordem de Serviço de número (N_OS_tag) foi atualizada.\nStatus atual: (Status_OS_tag)\n\nAgradecemos a preferência.\n\nAtenciosamente,\nEquipe de Suporte"
    ];
}

function enviarEmailTesteSimples(string $destinatarioEmail, string $assuntoTemplate, string $corpoTemplate) {
    $config = carregarConfigSmtp();
    if (is_string($config)) return ['success' => false, 'message' => $config];
    $tags = ['(N_OS_tag)' => '999', '(Nome_cliente_tag)' => 'Teste', '(Status_OS_tag)' => 'Pendente', '(equipamento_OS_tag)' => 'Exemplo'];
    $assunto = str_replace(array_keys($tags), array_values($tags), $assuntoTemplate);
    $corpoHtml = nl2br(htmlspecialchars(str_replace(array_keys($tags), array_values($tags), $corpoTemplate)));
    return enviarEmailPHPMailer($config, $destinatarioEmail, 'Usuário Teste', $assunto, $corpoHtml, $config['smtp_from_name'] ?? 'Suporte');
}

function enviarEmailOsComAnexo(PDO $pdo, int $os_id): array
{
    $pdfData = gerarPdfParaAnexo($pdo, $os_id);
    if (!$pdfData) return ['success' => false, 'message' => "Falha ao gerar PDF."];
    return enviarEmailOS($pdo, $os_id, $pdfData['content'], $pdfData['filename']);
}

function enviarEmailOS(PDO $pdo, int $os_id, ?string $attachmentContent = null, ?string $attachmentFilename = null): array
{
    $config = carregarConfigSmtp();
    if (is_string($config)) return ['success' => false, 'message' => $config];

    $stmt = $pdo->prepare("SELECT os.id, os.status, os.equipamento, c.nome as cliente_nome, c.email as cliente_email FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE os.id = ?");
    $stmt->execute([$os_id]);
    $dadosOS = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$dadosOS) return ['success' => false, 'message' => "OS não encontrada."];
    if (empty($dadosOS['cliente_email'])) return ['success' => false, 'message' => "Cliente sem e-mail."];

    $tags = ['(N_OS_tag)' => $dadosOS['id'], '(Nome_cliente_tag)' => $dadosOS['cliente_nome'], '(Status_OS_tag)' => $dadosOS['status'], '(equipamento_OS_tag)' => $dadosOS['equipamento']];
    $assunto = str_replace(array_keys($tags), array_values($tags), $config['email_subject_template'] ?? 'OS: (N_OS_tag)');
    $corpoHtml = nl2br(htmlspecialchars(str_replace(array_keys($tags), array_values($tags), $config['email_body_template'] ?? 'Status: (Status_OS_tag)')));

    return enviarEmailPHPMailer($config, $dadosOS['cliente_email'], $dadosOS['cliente_nome'], $assunto, $corpoHtml, $config['smtp_from_name'] ?? 'Suporte', $attachmentContent, $attachmentFilename);
}

function enviarEmailPHPMailer(array $config, string $destinatarioEmail, string $destinatarioNome, string $assunto, string $corpoHtml, string $remetenteNome, ?string $attachmentContent = null, ?string $attachmentFilename = null): array
{
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host       = $config['smtp_host'];
        $mail->SMTPAuth   = true;
        $mail->Username   = $config['smtp_user'];
        $mail->Password   = $config['smtp_password:'];
        $mail->SMTPSecure = $config['smtp_security'] ?? 'tls';
        $mail->Port       = (int)$config['smtp_port'];
        $mail->CharSet    = 'UTF-8';
        $mail->setFrom($config['smtp_user'], $remetenteNome);
        $mail->addAddress($destinatarioEmail, $destinatarioNome);
        if ($attachmentContent && $attachmentFilename) $mail->addStringAttachment($attachmentContent, $attachmentFilename);
        $mail->isHTML(true);
        $mail->Subject = $assunto;
        $mail->Body    = $corpoHtml;
        $mail->AltBody = strip_tags($corpoHtml);
        $mail->send();
        return ['success' => true];
    } catch (Exception $e) {
        return ['success' => false, 'message' => $mail->ErrorInfo];
    }
}
?>