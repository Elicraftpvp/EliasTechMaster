<?php
// Configurações do banco de dados
$host = 'localhost';
$dbname = 'sistema_os'; // Certifique-se que o nome está correto
$user = 'root';
$pass = '';

// Opções do PDO para um comportamento mais seguro
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, // Lança exceções em caso de erro
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,       // Retorna os resultados como array associativo
    PDO::ATTR_EMULATE_PREPARES   => false,                  // Usa prepared statements nativos
];

try {
    // Cria a instância do PDO para a conexão
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass, $options);
} catch (\PDOException $e) {
    // Em caso de falha na conexão, envia uma resposta de erro em JSON
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Erro de conexão com o banco de dados.']);
    // Em produção, você logaria o erro em vez de exibi-lo
    // error_log("Erro de conexão com o banco de dados: " . $e->getMessage());
    exit();
}
?>