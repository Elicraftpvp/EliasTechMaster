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
                // Busca uma OS específica com detalhes do cliente e serviços
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

                // MODIFICAÇÃO AQUI: Adicionamos s.tipo e s.valor para referência no frontend
                $stmt_servicos = $pdo->prepare("SELECT os_s.*, 
                                                       s.nome as servico_nome, 
                                                       s.tipo as servico_tipo,
                                                       s.valor as valor_catalogo 
                                                FROM os_servicos os_s
                                                JOIN servicos s ON os_s.servico_id = s.id
                                                WHERE os_s.os_id = ?");
                $stmt_servicos->execute([$id]);
                $os['servicos'] = $stmt_servicos->fetchAll(PDO::FETCH_ASSOC);

                echo json_encode($os);
            } else {
                // Busca todas as OS
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

                if ($clienteExistente) {
                    $clienteId = $clienteExistente['id'];
                } else {
                    $sqlCliente = "INSERT INTO clientes (nome, telefone, email) VALUES (?, ?, ?)";
                    $stmtCliente = $pdo->prepare($sqlCliente);
                    $stmtCliente->execute([$data['clienteNome'], $data['clienteTelefone'], $data['clienteEmail']]);
                    $clienteId = $pdo->lastInsertId();
                }
            }
            
            $sqlOs = "INSERT INTO ordens_servico (cliente_id, equipamento, problema_relatado, laudo_tecnico, valor_total, status) 
                      VALUES (?, ?, ?, ?, ?, 'Aberta')";
            $stmtOs = $pdo->prepare($sqlOs);
            $stmtOs->execute([$clienteId, $data['equipamento'], $data['problema'], $data['laudo'], (float)$data['total']]);
            $osId = $pdo->lastInsertId();

            $sqlOsServicos = "INSERT INTO os_servicos (os_id, servico_id, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
            $stmtOsServicos = $pdo->prepare($sqlOsServicos);
            
            foreach ($data['servicos'] as $servico) {
                // O subtotal de descontos não é relevante da mesma forma, mas guardamos o valor calculado
                $stmtOsServicos->execute([$osId, $servico['id'], (int)$servico['qtd'], (float)$servico['valorUnitario'], (float)$servico['subtotal']]);
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

            // ATUALIZAÇÃO RÁPIDA DE STATUS (do dropdown na tabela)
            if (isset($data['quick_update']) && $data['quick_update'] === true) {
                $sql_quick_update = "UPDATE ordens_servico SET status = ?, data_saida = ? WHERE id = ?";
                $stmt_quick_update = $pdo->prepare($sql_quick_update);
                
                $data_saida = ($data['status'] === 'Concluída' || $data['status'] === 'Cancelada') ? date('Y-m-d H:i:s') : null;

                $stmt_quick_update->execute([
                    $data['status'],
                    $data_saida, 
                    $id
                ]);
                
                $filename = "OS-" . $id . ".pdf";
                $filepath = __DIR__ . '/pdfs/' . $filename;
                if (file_exists($filepath)) {
                    @unlink($filepath);
                }
                echo json_encode(['success' => true]);

            // ATUALIZAÇÃO COMPLETA (do modal)
            } else {
                $pdo->beginTransaction();

                $sql_update = "UPDATE ordens_servico SET equipamento = ?, problema_relatado = ?, laudo_tecnico = ?, status = ?, valor_total = ? WHERE id = ?";
                $stmt_update = $pdo->prepare($sql_update);
                $stmt_update->execute([
                    $data['equipamento'],
                    $data['problema'],
                    $data['laudo'],
                    $data['status'],
                    (float)$data['total'],
                    $id
                ]);

                $stmt_delete_servicos = $pdo->prepare("DELETE FROM os_servicos WHERE os_id = ?");
                $stmt_delete_servicos->execute([$id]);

                $sql_insert_servicos = "INSERT INTO os_servicos (os_id, servico_id, quantidade, valor_unitario, subtotal) VALUES (?, ?, ?, ?, ?)";
                $stmt_insert_servicos = $pdo->prepare($sql_insert_servicos);
                foreach ($data['servicos'] as $servico) {
                    $stmt_insert_servicos->execute([$id, $servico['id'], (int)$servico['qtd'], (float)$servico['valorUnitario'], (float)$servico['subtotal']]);
                }

                $pdo->commit();

                $filename = "OS-" . $id . ".pdf";
                $filepath = __DIR__ . '/pdfs/' . $filename;
                if (file_exists($filepath)) {
                    @unlink($filepath);
                }

                echo json_encode(['success' => true]);
            }
            break;

        case 'DELETE':
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID da OS não fornecido.']);
                exit;
            }
            $pdo->beginTransaction();
            $stmt1 = $pdo->prepare("DELETE FROM os_servicos WHERE os_id = ?");
            $stmt1->execute([$id]);
            $stmt2 = $pdo->prepare("DELETE FROM ordens_servico WHERE id = ?");
            $stmt2->execute([$id]);
            $pdo->commit();
            
            $filename = "OS-" . $id . ".pdf";
            $filepath = __DIR__ . '/pdfs/' . $filename;
            if (file_exists($filepath)) {
                @unlink($filepath);
            }
            echo json_encode(['success' => true]);
            break;
        
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Método não permitido']);
            break;
    }

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro no servidor: ' . $e->getMessage()]);
}
?>