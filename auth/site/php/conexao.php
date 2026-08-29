<?php
// Configuração do banco de dados SQLite local
$dbDir = dirname(__DIR__, 3) . DIRECTORY_SEPARATOR . 'dataBase';
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}
$dbPath = $dbDir . DIRECTORY_SEPARATOR . 'sistema_os.db';

// Opções do PDO para comportamento seguro e tratamento de erros
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lança exceções em caso de erro
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Retorna os resultados como array associativo
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Usa prepared statements nativos
];

try {
    // Cria a instância do PDO para a conexão com SQLite
    $pdo = new PDO("sqlite:" . $dbPath, null, null, $options);

    // Configurações essenciais para estabilidade, performance e prevenção de corrupção
    $pdo->exec("PRAGMA foreign_keys = ON;");
    $pdo->exec("PRAGMA journal_mode = WAL;");
    $pdo->exec("PRAGMA synchronous = NORMAL;");
    $pdo->exec("PRAGMA busy_timeout = 5000;");
} catch (\PDOException $e) {
    // Em caso de falha na conexão, envia uma resposta de erro em JSON
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Erro de conexão com o banco de dados SQLite.',
        'details' => $e->getMessage()
    ]);
    exit();
}
?>