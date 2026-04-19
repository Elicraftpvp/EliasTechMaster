<?php
require_once 'conexao.php';
require_once 'email.php';

if ($argc < 2) {
    echo "Uso: php disparar_email_os.php <os_id>\n";
    exit(1);
}

$osId = (int)$argv[1];

try {
    // 1. Tentar enviar o e-mail
    $resultado = enviarEmailOsComAnexo($pdo, $osId);
    
    // 2. Atualizar o status na fila (email_queue)
    // Buscamos o ID mais recente para esta OS que esteja 'pendente' ou 'erro'
    $stmt_find = $pdo->prepare("SELECT id FROM email_queue WHERE os_id = ? ORDER BY id DESC LIMIT 1");
    $stmt_find->execute([$osId]);
    $queueItem = $stmt_find->fetch();

    if ($queueItem) {
        $queueId = $queueItem['id'];
        if ($resultado['success']) {
            $stmt_upd = $pdo->prepare("UPDATE email_queue SET status = 'enviado', ultima_tentativa = NOW(), erro = NULL WHERE id = ?");
            $stmt_upd->execute([$queueId]);
        } else {
            $stmt_upd = $pdo->prepare("UPDATE email_queue SET status = 'erro', ultima_tentativa = NOW(), erro = ? WHERE id = ?");
            $stmt_upd->execute([$resultado['message'], $queueId]);
        }
    }

    if ($resultado['success']) {
        echo "E-mail enviado com sucesso para a OS #$osId.\n";
    } else {
        echo "Falha ao enviar e-mail para a OS #$osId: " . $resultado['message'] . "\n";
    }

} catch (Exception $e) {
    echo "Erro inesperado no disparar_email_os.php: " . $e->getMessage() . "\n";
}
?>