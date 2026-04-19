<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
require 'conexao.php';
header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? null;

try {
    switch ($method) {
        case 'GET':
            if ($id) {
                $stmt = $pdo->prepare("SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email 
                                       FROM ordens_servico os 
                                       JOIN clientes c ON os.cliente_id = c.id 
                                       WHERE os.id = ?");
                $stmt->execute([$id]);
                $os = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$os) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Ordem de Serviço não encontrada.']);
                    exit;
                }

                $stmt_servicos = $pdo->prepare("SELECT os_s.*, 
                                                       os_s.nome_item as servico_nome, 
                                                       os_s.tipo_item as servico_tipo
                                                FROM os_servicos os_s
                                                WHERE os_s.os_id = ?");
                $stmt_servicos->execute([$id]);
                $os['servicos'] = $stmt_servicos->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode($os);
            } else {
                $sql = "SELECT os.*, c.nome as cliente_nome 
                        FROM ordens_servico os
                        JOIN clientes c ON os.cliente_id = c.id
                        ORDER BY os.id DESC";
                $stmt = $pdo->query($sql);
                echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            }
            break;
        
        case 'POST':
            $data = json_decode(file_get_contents('php://input'), true);
            $pdo->beginTransaction();
            $clienteId = $data['clienteId'] ?? null;
            if (empty($clienteId)) {
                $stmtBusca = $pdo->prepare("SELECT id FROM clientes WHERE nome = ? AND telefone = ?");
                $stmtBusca->execute([$data['clienteNome'], $data['clienteTelefone']]);
                $clienteExistente = $stmtBusca->fetch();
                if ($clienteExistente) { $clienteId = $clienteExistente['id']; } else {
                    $sqlCliente = "INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)";
                    $stmtCliente = $pdo->prepare($sqlCliente);
                    $stmtCliente->execute([$data['clienteNome'], $data['clienteTelefone'], $data['clienteEmail']]);
                    $clienteId = $pdo->lastInsertId();
                }
            }
            $sqlOs = "INSERT INTO ordens_servico (cliente_id, equipamento, problema_relatado, laudo_tecnico, valor_total, status) VALUES (?, ?, ?, ?, ?, 'Aberta')";
            $stmtOs = $pdo->prepare($sqlOs);
            $stmtOs->execute([$clienteId, $data['equipamento'], $data['problema'], $data['laudo'], (float)$data['total']]);
            $osId = $pdo->lastInsertId();
            
            $sqlOsServicos = "INSERT INTO os_servicos (os_id, servico_id, nome_item, tipo_item, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmtOsServicos = $pdo->prepare($sqlOsServicos);
            foreach ($data['servicos'] as $servico) {
                $servicoId = (isset($servico['id']) && is_numeric($servico['id'])) ? (int)$servico['id'] : null;
                $stmtOsServicos->bindValue(1, $osId);
                $stmtOsServicos->bindValue(2, $servicoId, $servicoId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                $stmtOsServicos->bindValue(3, $servico['nome']);
                $stmtOsServicos->bindValue(4, $servico['tipo']);
                $stmtOsServicos->bindValue(5, (int)$servico['qtd']);
                $stmtOsServicos->bindValue(6, (float)$servico['valorUnitario']);
                $stmtOsServicos->bindValue(7, (float)$servico['subtotal']);
                $stmtOsServicos->execute();
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'os_id' => $osId, 'cliente_id' => $clienteId]);
            break;

        case 'PUT':
             if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID da OS não fornecido.']);
                exit;
            }
            $data = json_decode(file_get_contents('php://input'), true);

            if (isset($data['quick_update']) && $data['quick_update'] === true) {
                $sql_quick_update = "UPDATE ordens_servico SET status = ?, data_saida = ? WHERE id = ?";
                $stmt_quick_update = $pdo->prepare($sql_quick_update);
                $data_saida = ($data['status'] === 'Concluída' || $data['status'] === 'Cancelada') ? date('Y-m-d H:i:s') : null;
                $stmt_quick_update->execute([$data['status'], $data_saida, $id]);
                
                if ($data['status'] === 'Concluída') {
                    // REGISTRA NA FILA DE EMAIL
                    $stmt_cli = $pdo->prepare("SELECT c.email, c.nome FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE os.id = ?");
                    $stmt_cli->execute([$id]);
                    $cli = $stmt_cli->fetch();
                    if ($cli && !empty($cli['email'])) {
                        $stmt_queue = $pdo->prepare("INSERT INTO email_queue (os_id, destinatario, assunto) VALUES (?, ?, ?)");
                        $stmt_queue->execute([$id, $cli['email'], "Ordem de Serviço #$id Concluída"]);
                    }

                    // Tenta detectar o caminho do PHP no XAMPP ou usa o padrão
                    $phpPath = 'php';
                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        $possiveis = [
                            'C:\\xampp\\php\\php.exe',
                            'D:\\xampp\\php\\php.exe',
                            'B:\\Programs\\XAMPP\\php\\php.exe',
                            dirname(__DIR__, 5) . '\\php\\php.exe',
                            'php'
                        ];
                        foreach ($possiveis as $p) {
                            if ($p === 'php' || file_exists($p)) {
                                $phpPath = $p;
                                break;
                            }
                        }
                    }

                    $scriptPath = __DIR__ . '/disparar_email_os.php';
                    $command = escapeshellarg($phpPath) . ' ' . escapeshellarg($scriptPath) . ' ' . escapeshellarg($id);
                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        // IMPORTANTE: No Windows, o primeiro argumento entre aspas do comando 'start' é o Título. 
                        // Usamos "" para o título para evitar que o caminho do PHP seja ignorado.
                        pclose(popen("start /B \"\" " . $command, "r"));
                    } else {
                        shell_exec($command . ' > /dev/null 2>&1 &');
                    }
                }
                echo json_encode(['success' => true]);
            } else {
                $pdo->beginTransaction();
                $sql_update = "UPDATE ordens_servico SET equipamento = ?, problema_relatado = ?, laudo_tecnico = ?, status = ?, valor_total = ? WHERE id = ?";
                $stmt_update = $pdo->prepare($sql_update);
                $stmt_update->execute([ $data['equipamento'], $data['problema'], $data['laudo'], $data['status'], (float)$data['total'], $id ]);
                
                $stmt_delete_servicos = $pdo->prepare("DELETE FROM os_servicos WHERE os_id = ?");
                $stmt_delete_servicos->execute([$id]);
                
                $sql_insert_servicos = "INSERT INTO os_servicos (os_id, servico_id, nome_item, tipo_item, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt_insert_servicos = $pdo->prepare($sql_insert_servicos);
                foreach ($data['servicos'] as $servico) {
                    $servicoId = (isset($servico['id']) && is_numeric($servico['id'])) ? (int)$servico['id'] : null;
                    $stmt_insert_servicos->bindValue(1, $id);
                    $stmt_insert_servicos->bindValue(2, $servicoId, $servicoId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
                    $stmt_insert_servicos->bindValue(3, $servico['nome']);
                    $stmt_insert_servicos->bindValue(4, $servico['tipo']);
                    $stmt_insert_servicos->bindValue(5, (int)$servico['qtd']);
                    $stmt_insert_servicos->bindValue(6, (float)$servico['valorUnitario']);
                    $stmt_insert_servicos->bindValue(7, (float)$servico['subtotal']);
                    $stmt_insert_servicos->execute();
                }
                $pdo->commit();
                echo json_encode(['success' => true]);
            }
            break;

        case 'DELETE':
            if (!$id) { http_response_code(400); echo json_encode(['error' => 'ID da OS não fornecido.']); exit; }
            $pdo->beginTransaction();
            $pdo->prepare("DELETE FROM os_servicos WHERE os_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM ordens_servico WHERE id = ?")->execute([$id]);
            $pdo->commit();
            echo json_encode(['success' => true]);
            break;
        
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
            break;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) { $pdo->rollBack(); }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>