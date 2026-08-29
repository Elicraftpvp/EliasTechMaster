<?php
ob_start();
ini_set('display_errors', 0);
error_reporting(E_ALL);
require 'conexao.php';
header('Content-Type: application/json');

try {
    // Contadores de OS
    $abertas_sql = "SELECT COUNT(*) FROM ordens_servico WHERE status IN ('Aberta', 'Em Andamento', 'Aguardando Peças')";
    $os_abertas = (int)$pdo->query($abertas_sql)->fetchColumn();

    $andamento_sql = "SELECT COUNT(*) FROM ordens_servico WHERE status = 'Em Andamento'";
    $os_andamento = (int)$pdo->query($andamento_sql)->fetchColumn();

    $finalizadas_sql = "SELECT COUNT(*) FROM ordens_servico WHERE status = 'Concluída'";
    $os_finalizadas = (int)$pdo->query($finalizadas_sql)->fetchColumn();

    $clientes_sql = "SELECT COUNT(*) FROM clientes";
    $total_clientes = (int)$pdo->query($clientes_sql)->fetchColumn();

    // Valores Financeiros de Caixa (Receitas de OS Concluídas)
    $mes_sql = "SELECT COALESCE(SUM(valor_total), 0) FROM ordens_servico WHERE status = 'Concluída' AND strftime('%Y-%m', COALESCE(data_saida, data_entrada)) = strftime('%Y-%m', 'now')";
    $total_mes = (float)$pdo->query($mes_sql)->fetchColumn();

    $ano_sql = "SELECT COALESCE(SUM(valor_total), 0) FROM ordens_servico WHERE status = 'Concluída' AND strftime('%Y', COALESCE(data_saida, data_entrada)) = strftime('%Y', 'now')";
    $total_ano = (float)$pdo->query($ano_sql)->fetchColumn();

    $total_geral_sql = "SELECT COALESCE(SUM(valor_total), 0) FROM ordens_servico WHERE status = 'Concluída'";
    $total_geral = (float)$pdo->query($total_geral_sql)->fetchColumn();

    ob_clean();
    echo json_encode([
        'success' => true,
        'os_abertas' => $os_abertas,
        'os_andamento' => $os_andamento,
        'os_finalizadas' => $os_finalizadas,
        'total_clientes' => $total_clientes,
        'financeiro' => [
            'total_mes' => $total_mes,
            'total_ano' => $total_ano,
            'total_geral' => $total_geral
        ]
    ]);

} catch (Throwable $e) {
    ob_clean();
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao buscar dados do dashboard: ' . $e->getMessage()]);
}
ob_end_flush();
?>