<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'conexao.php';
header('Content-Type: application/json');

try {
    $abertas_sql = "SELECT COUNT(*) FROM ordens_servico WHERE status IN ('Aberta', 'Em Andamento', 'Aguardando Peças')";
    $os_abertas = $pdo->query($abertas_sql)->fetchColumn();

    $finalizadas_sql = "SELECT COUNT(*) FROM ordens_servico WHERE status = 'Concluída'";
    $os_finalizadas = $pdo->query($finalizadas_sql)->fetchColumn();

    $clientes_sql = "SELECT COUNT(*) FROM clientes";
    $total_clientes = $pdo->query($clientes_sql)->fetchColumn();

    echo json_encode([
        'os_abertas' => $os_abertas,
        'os_finalizadas' => $os_finalizadas,
        'total_clientes' => $total_clientes
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao buscar dados do dashboard: ' . $e->getMessage()]);
}
?>