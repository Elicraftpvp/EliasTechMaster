<?php
// Versão de Depuração - Registra cada passo

// Este script é projetado para ser chamado em segundo plano.
// Ele não deve produzir nenhuma saída (echo/print).

$logFile = __DIR__ . '/../mail/email_trigger.log';
// Limpa o log antigo para facilitar a leitura a cada nova tentativa.
if (file_exists($logFile)) { unlink($logFile); }

function log_message($message) {
    global $logFile;
    file_put_contents($logFile, date('[Y-m-d H:i:s] ') . $message . "\n", FILE_APPEND);
}

log_message("--- INICIANDO SCRIPT DE DISPARO DE E-MAIL ---");

// Pega o ID da OS passado como argumento da linha de comando
if (!isset($argv[1]) || (int)$argv[1] <= 0) {
    log_message("ERRO FATAL: ID da OS não foi fornecido ou é inválido. Argumento recebido: " . ($argv[1] ?? 'NENHUM'));
    exit;
}
$osId = (int)$argv[1];
log_message("ID da OS recebido: #" . $osId);

// Verificando e incluindo arquivos necessários
$files_to_include = [
    'conexao.php',
    'email.php' // Lembre-se que email.php já inclui gerar_pdf.php
];

foreach ($files_to_include as $file) {
    $filePath = __DIR__ . '/' . $file;
    log_message("Verificando arquivo: " . $filePath);
    if (file_exists($filePath)) {
        log_message("Arquivo encontrado. Incluindo " . $file . "...");
        require_once $filePath;
        log_message("Arquivo " . $file . " incluído com sucesso.");
    } else {
        log_message("ERRO FATAL: O arquivo obrigatório '" . $file . "' não foi encontrado no caminho: " . $filePath);
        exit; // Para a execução se um arquivo essencial faltar
    }
}

log_message("Todos os arquivos foram incluídos. Tentando enviar e-mail...");

try {
    // A variável $pdo deve estar disponível a partir do 'conexao.php'
    if (!isset($pdo)) {
        log_message("ERRO FATAL: A variável de conexão \$pdo não foi definida após incluir conexao.php.");
        exit;
    }

    // Chama a função que gera o PDF e envia o e-mail com anexo.
    $resultado = enviarEmailOsComAnexo($pdo, $osId);

    if ($resultado['success']) {
        log_message("SUCESSO: E-mail para a OS #" . $osId . " foi processado com sucesso pela função.");
    } else {
        log_message("FALHA: A função de envio retornou um erro para a OS #" . $osId . ". Motivo: " . $resultado['message']);
    }
} catch (Throwable $e) { // Captura qualquer tipo de erro ou exceção
    log_message("ERRO CRÍTICO no bloco try-catch: " . $e->getMessage() . " no arquivo " . $e->getFile() . " na linha " . $e->getLine());
}

log_message("--- FIM DO SCRIPT DE DISPARO DE E-MAIL ---");