<?php
// Inicia o buffer de saída para capturar qualquer erro antes que seja impresso
ob_start();

header('Content-Type: application/json');
require_once 'conexao.php';
require_once 'email.php'; 

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Bloco try-catch principal para garantir que sempre retornemos JSON
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input = json_decode(file_get_contents('php://input'), true);

    // Permite sobrescrever o método (ex: PUT, DELETE) via POST
    if ($method == 'POST' && isset($input['_method'])) {
        $method = strtoupper($input['_method']);
    }

    // Determina o tipo de recurso que está sendo solicitado
    $tipo = $_GET['tipo'] ?? ($input['tipo'] ?? null);
    
    // Fallback para REQUEST caso os outros falhem
    if (!$tipo) {
        $tipo = $_REQUEST['tipo'] ?? null;
    }

    switch ($tipo) {
        case 'email_completo':
            handle_email_completo($pdo, $method, $input);
            break;

        case 'usuarios':
            handle_usuarios($pdo, $method, $input, $_GET);
            break;
        
        case 'pix':
            handle_pix($pdo, $method, $input);
            break;

        case 'fila_email':
            handle_fila_email($pdo, $method, $input, $_GET);
            break;

        default:
            http_response_code(400);
            $msg = 'Tipo de requisição inválido. Recebido: ' . ($tipo ?: 'null');
            echo json_encode(['success' => false, 'message' => $msg]);
            break;
    }

} catch (Throwable $e) {
    ob_clean(); 
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Ocorreu um erro interno no servidor.',
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
}

ob_end_flush();


function handle_email_completo($pdo, $method, $input) {
    $configFile = __DIR__ . '/../mail/email_config.json';
    $acao = $input['acao'] ?? null;

    if ($method == 'POST') {
        switch ($acao) {
            case 'testar_smtp':
                testar_conexao_smtp($input, $configFile);
                return;
            case 'enviar_teste_simples':
                enviar_email_teste_simples($input);
                return;
            case 'enviar_teste_real':
                enviar_email_teste_real($pdo, $input);
                return;
        }
    }

    if ($method == 'GET') {
        if (file_exists($configFile)) {
            $config = json_decode(file_get_contents($configFile), true) ?: [];
            $config['smtp_pass_exists'] = !empty($config['smtp_password:']);
            unset($config['smtp_password:']);
            echo json_encode($config);
        } else {
            echo json_encode([]);
        }
    } 
    elseif ($method == 'PUT') {
        $configExistente = file_exists($configFile) ? json_decode(file_get_contents($configFile), true) : [];
        if (!is_array($configExistente)) $configExistente = [];

        $configParaSalvar = $input;
        if (empty($input['smtp_pass']) && isset($configExistente['smtp_password:'])) {
            $configParaSalvar['smtp_password:'] = $configExistente['smtp_password:'];
        } else {
            $configParaSalvar['smtp_password:'] = $input['smtp_pass'];
        }

        unset($configParaSalvar['_method'], $configParaSalvar['tipo'], $configParaSalvar['smtp_pass'], $configParaSalvar['acao']);

        if (file_put_contents($configFile, json_encode($configParaSalvar, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
            echo json_encode(['success' => true, 'message' => 'Configurações de e-mail salvas com sucesso!']);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Não foi possível salvar o arquivo de configuração.']);
        }
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    }
}


function testar_conexao_smtp($input, $configFile) {
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = $input['smtp_host'];
        $mail->Port = (int)$input['smtp_port'];
        $mail->SMTPAuth = (bool)$input['smtp_auth'];
        $mail->Username = $input['smtp_user'];
        $mail->SMTPSecure = $input['smtp_security'] === 'none' ? '' : $input['smtp_security'];

        if (!empty($input['smtp_pass'])) {
            $mail->Password = $input['smtp_pass'];
        } elseif (file_exists($configFile)) {
            $configSalva = json_decode(file_get_contents($configFile), true);
            if (!empty($configSalva['smtp_password:'])) {
                $mail->Password = $configSalva['smtp_password:'];
            } else {
                throw new Exception("Senha não encontrada.");
            }
        } else {
            throw new Exception("Senha obrigatória.");
        }

        if ($mail->smtpConnect()) {
            $mail->smtpClose();
            echo json_encode(['success' => true, 'message' => 'Conexão SMTP bem-sucedida!']);
        } else {
            throw new Exception("Falha ao conectar.");
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => "Erro: " . $e->getMessage()]);
    }
}

function enviar_email_teste_simples($input) {
    if (empty($input['destinatario']) || !filter_var($input['destinatario'], FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Destinatário inválido.']);
        return;
    }
    
    $resultado = enviarEmailTesteSimples($input['destinatario'], $input['assunto'], $input['corpo']);
    if ($resultado['success']) {
        echo json_encode(['success' => true, 'message' => "E-mail enviado!"]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $resultado['message']]);
    }
}

function enviar_email_teste_real($pdo, $input) {
    $os_id = $input['os_id'] ?? null;
    if (empty($os_id)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID da OS não fornecido.']);
        return;
    }
    $resultado = enviarEmailOS($pdo, $os_id);
    if ($resultado['success']) {
        echo json_encode(['success' => true, 'message' => $resultado['message']]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => $resultado['message']]);
    }
}

function handle_usuarios($pdo, $method, $input, $get) {
    try {
        switch ($method) {
            case 'GET':
                if (isset($get['id'])) {
                    $stmt = $pdo->prepare("SELECT id, nome, email, telefone, endereco FROM usuarios WHERE id = ?");
                    $stmt->execute([$get['id']]);
                    echo json_encode($stmt->fetch(PDO::FETCH_ASSOC) ?: null);
                } else {
                    $stmt = $pdo->query("SELECT id, nome, email, telefone, data_cadastro FROM usuarios ORDER BY nome");
                    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
                }
                break;
            case 'POST':
                $stmt = $pdo->prepare("INSERT INTO usuarios (nome, email, senha, telefone, endereco) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$input['nome'], $input['email'], password_hash($input['senha'], PASSWORD_DEFAULT), $input['telefone'], $input['endereco']]);
                echo json_encode(['success' => true]);
                break;
            case 'PUT':
                $sql = "UPDATE usuarios SET nome = ?, email = ?, telefone = ?, endereco = ?";
                $params = [$input['nome'], $input['email'], $input['telefone'], $input['endereco']];
                if (!empty($input['senha'])) {
                    $sql .= ", senha = ?";
                    $params[] = password_hash($input['senha'], PASSWORD_DEFAULT);
                }
                $sql .= " WHERE id = ?";
                $params[] = $input['id'];
                $pdo->prepare($sql)->execute($params);
                echo json_encode(['success' => true]);
                break;
            case 'DELETE':
                $pdo->prepare("DELETE FROM usuarios WHERE id = ?")->execute([$input['id']]);
                echo json_encode(['success' => true]);
                break;
            default:
                http_response_code(405);
                echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
                break;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro no banco: ' . $e->getMessage()]);
    }
}

function get_config($pdo, $chave, $default = '') {
    $stmt = $pdo->prepare("SELECT valor FROM configuracoes WHERE chave = ?");
    $stmt->execute([$chave]);
    $res = $stmt->fetch();
    return $res ? $res['valor'] : $default;
}

function set_config($pdo, $chave, $valor) {
    $stmt = $pdo->prepare("INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?");
    return $stmt->execute([$chave, $valor, $valor]);
}

function handle_pix($pdo, $method, $input) {
    if ($method == 'GET') {
        echo json_encode([
            'pix_chave' => get_config($pdo, 'pix_chave'),
            'pix_nome' => get_config($pdo, 'pix_nome'),
            'pix_cidade' => get_config($pdo, 'pix_cidade')
        ]);
    } elseif ($method == 'PUT' || $method == 'POST') {
        set_config($pdo, 'pix_chave', $input['pix_chave'] ?? '');
        set_config($pdo, 'pix_nome', $input['pix_nome'] ?? '');
        set_config($pdo, 'pix_cidade', $input['pix_cidade'] ?? '');
        echo json_encode(['success' => true, 'message' => 'Configurações de PIX salvas!']);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
    }
}

function handle_fila_email($pdo, $method, $input, $get) {
    switch ($method) {
        case 'GET':
            $stmt = $pdo->query("SELECT * FROM email_queue ORDER BY id DESC LIMIT 100");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
            break;
        case 'POST':
            $acao = $input['acao'] ?? '';
            if ($acao === 'reenviar') {
                $id = $input['id'] ?? null;
                $stmt = $pdo->prepare("SELECT os_id FROM email_queue WHERE id = ?");
                $stmt->execute([$id]);
                $item = $stmt->fetch();
                if ($item) {
                    $pdo->prepare("UPDATE email_queue SET status = 'pendente', erro = NULL WHERE id = ?")->execute([$id]);
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
                    $command = escapeshellarg($phpPath) . ' ' . escapeshellarg($scriptPath) . ' ' . escapeshellarg($item['os_id']);
                    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                        // Usamos "" para o título para evitar que o caminho do PHP seja interpretado como tal
                        pclose(popen("start /B \"\" " . $command, "r"));
                    } else {
                        shell_exec($command . ' > /dev/null 2>&1 &');
                    }
                    echo json_encode(['success' => true, 'message' => 'Reenvio disparado!']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Não encontrado.']);
                }
            }
            break;
        case 'DELETE':
            $pdo->prepare("DELETE FROM email_queue WHERE id = ?")->execute([$input['id'] ?? null]);
            echo json_encode(['success' => true, 'message' => 'Excluído da fila.']);
            break;
        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método não permitido.']);
            break;
    }
}
?>