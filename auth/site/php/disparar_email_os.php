<?php
/**
 * Script para processar o envio de e-mail em segundo plano.
 * Registra logs detalhados em ../mail/email_trigger.log
 */

$logFile = __DIR__ . '/../mail/email_trigger.log';

function logMsg($msg) {
    global $logFile;
    $date = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$date] $msg\n", FILE_APPEND);
}

logMsg("--- INICIANDO PROCESSO DE DISPARO ---");

require_once 'conexao.php';
require_once 'email.php';

if ($argc < 2) {
    logMsg("ERRO: Nenhum ID de OS fornecido.");
    exit(1);
}

$osId = (int)$argv[1];
logMsg("Processando OS #$osId...");

try {
    // 0. Registrar início da tentativa no Banco
    $stmt_start = $pdo->prepare("UPDATE email_queue SET ultima_tentativa = NOW(), status = 'pendente' WHERE os_id = ? AND status != 'enviado' ORDER BY id DESC LIMIT 1");
    $stmt_start->execute([$osId]);

    // 1. Tentar enviar o e-mail
    logMsg("Chamando enviarEmailOsComAnexo...");
    $resultado = enviarEmailOsComAnexo($pdo, $osId);
    
    // 2. Atualizar o status na fila (email_queue)
    $stmt_find = $pdo->prepare("SELECT id FROM email_queue WHERE os_id = ? ORDER BY id DESC LIMIT 1");
    $stmt_find->execute([$osId]);
    $queueItem = $stmt_find->fetch();

    if ($queueItem) {
        $queueId = $queueItem['id'];
        if ($resultado['success']) {
            logMsg("SUCESSO: E-mail enviado.");
            $stmt_upd = $pdo->prepare("UPDATE email_queue SET status = 'enviado', ultima_tentativa = NOW(), erro = NULL WHERE id = ?");
            $stmt_upd->execute([$queueId]);
        } else {
            logMsg("FALHA: " . $resultado['message']);
            $stmt_upd = $pdo->prepare("UPDATE email_queue SET status = 'erro', ultima_tentativa = NOW(), erro = ? WHERE id = ?");
            $stmt_upd->execute([$resultado['message'], $queueId]);
        }
    } else {
        logMsg("AVISO: Item não encontrado na fila para OS #$osId.");
    }

} catch (Exception $e) {
    logMsg("ERRO CRÍTICO: " . $e->getMessage());
}

logMsg("--- FIM DO PROCESSO ---");
?>