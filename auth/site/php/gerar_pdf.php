<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
error_reporting(E_ALL);

require 'conexao.php'; // Conexão com o banco é necessária para o método GET

$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Arquivo autoload.php do Composer não encontrado.']);
    exit;
}
require $autoloadPath;

use Dompdf\Dompdf;
use Dompdf\Options;

function generatePdf(array $data, string $numeroOS) {
    $servicosHtml = '';
    foreach ($data['servicos'] ?? [] as $servico) {
        $descricaoServico = htmlspecialchars($servico['servico_nome'] ?? $servico['nome'] ?? 'Serviço');
        $qtd = htmlspecialchars($servico['quantidade'] ?? $servico['qtd'] ?? 1);
        $valorUnitario = number_format((float)($servico['valor_unitario'] ?? $servico['valorUnitario']), 2, ',', '.');
        $subtotalFormatado = number_format((float)($servico['subtotal']), 2, ',', '.');

        $servicosHtml .= "
            <tr>
                <td>" . $descricaoServico . "</td>
                <td>" . $qtd . "</td>
                <td>R$ " . $valorUnitario . "</td>
                <td>R$ " . $subtotalFormatado . "</td>
            </tr>
        ";
    }
    
    $totalFormatado = number_format((float) ($data['valor_total'] ?? $data['total'] ?? 0), 2, ',', '.');
    $html = "
    <!DOCTYPE html><html><head><meta charset='UTF-8'><style>
        body { font-family: 'Helvetica', sans-serif; font-size: 12px; color: #333; } .header { text-align: center; margin-bottom: 20px; } .company-details { font-size: 11px; } .section-title { font-weight: bold; font-size: 14px; color: #51BE41; padding-bottom: 5px; border-bottom: 2px solid #51BE41; margin-bottom: 10px; } .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; } .info-table td { border: 1px solid #ccc; padding: 6px; } .info-table td.label { font-weight: bold; width: 100px; background-color: #f2f2f2; } .services-table { width: 100%; border-collapse: collapse; margin-top: 10px; } .services-table th, .services-table td { border: 1px solid #ccc; padding: 6px; text-align: left; } .services-table th { background-color: #f2f2f2; font-weight: bold; } .total-line { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; }
    </style></head><body>
        <div class='header'><h3>Elias TechMaster Reparos</h3><div class='company-details'>Rua Pedro Paulo de Abreu, 801 Forquilhinhas - São José/SC<br>E-mail: eliasgkersten@gmail.com | Fone: (48) 99833-9706</div></div>
        <table class='info-table'><tr><td style='width: 50%;'><strong>Nº OS:</strong> " . htmlspecialchars($numeroOS) . "</td><td style='width: 50%;'><strong>Emissão:</strong> " . date('d/m/Y') . "</td></tr></table>
        <div class='section-title'>Dados do Cliente</div>
        <table class='info-table'>
            <tr><td class='label'>Nome:</td><td>" . htmlspecialchars($data['cliente_nome'] ?? $data['clienteNome'] ?? 'Não informado') . "</td></tr>
            <tr><td class='label'>Telefone:</td><td>" . htmlspecialchars($data['cliente_telefone'] ?? $data['clienteTelefone'] ?? 'Não informado') . "</td></tr>
            <tr><td class='label'>E-mail:</td><td>" . htmlspecialchars($data['cliente_email'] ?? $data['clienteEmail'] ?? 'Não informado') . "</td></tr>
        </table>
        <div class='section-title'>Dados do Equipamento</div>
        <table class='info-table'><tr><td class='label'>Equipamento:</td><td>" . htmlspecialchars($data['equipamento'] ?? 'Não informado') . "</td></tr></table>
        <div class='section-title'>Problema Informado</div><p>" . nl2br(htmlspecialchars($data['problema_relatado'] ?? $data['problema'] ?? 'Não informado')) . "</p>
        <div class='section-title'>Laudo Técnico</div><p>" . nl2br(htmlspecialchars($data['laudo_tecnico'] ?? $data['laudo'] ?? 'Não informado')) . "</p>
        <div class='section-title'>Serviços Realizados</div>
        <table class='services-table'><thead><tr><th>Descrição</th><th style='width: 50px;'>Qtd.</th><th style='width: 100px;'>Valor Unit.</th><th style='width: 100px;'>Subtotal</th></tr></thead><tbody>" . $servicosHtml . "</tbody></table>
        <div class='total-line'>TOTAL: R$ " . $totalFormatado . "</div>
    </body></html>";

    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', true);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    return $dompdf->output();
}

$method = $_SERVER['REQUEST_METHOD'];

try {
    if ($method === 'GET') {
        $osId = $_GET['id'] ?? null;
        if (!$osId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID da OS não fornecido.']);
            exit;
        }

        $filename = "OS-" . $osId . ".pdf";
        $filepath = __DIR__ . '/pdfs/' . $filename;
        $pdfDir = __DIR__ . '/pdfs';

        if (file_exists($filepath)) {
            echo json_encode(['success' => true, 'fileName' => $filename]);
            exit;
        }

        // Se o PDF não existe, busca dados e gera
        $stmt_os = $pdo->prepare("SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE os.id = ?");
        $stmt_os->execute([$osId]);
        $data = $stmt_os->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Ordem de Serviço não encontrada no banco de dados.']);
            exit;
        }

        $stmt_servicos = $pdo->prepare("SELECT os_s.*, s.nome as servico_nome FROM os_servicos os_s JOIN servicos s ON os_s.servico_id = s.id WHERE os_s.os_id = ?");
        $stmt_servicos->execute([$osId]);
        $data['servicos'] = $stmt_servicos->fetchAll(PDO::FETCH_ASSOC);

        $pdfContent = generatePdf($data, 'OS-' . $osId);
        
        if (!is_dir($pdfDir)) mkdir($pdfDir, 0775, true);
        file_put_contents($filepath, $pdfContent);
        
        echo json_encode(['success' => true, 'fileName' => $filename]);

    } elseif ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || !isset($data['os_id'])) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Dados inválidos ou ID da OS não recebido.']);
            exit;
        }
        
        $osId = $data['os_id'];
        $numeroOS = 'OS-' . $osId;
        $filename = $numeroOS . '.pdf';
        $filepath = __DIR__ . '/pdfs/' . $filename;
        $pdfDir = __DIR__ . '/pdfs';
        
        $pdfContent = generatePdf($data, $numeroOS);
        
        if (!is_dir($pdfDir)) mkdir($pdfDir, 0775, true);
        file_put_contents($filepath, $pdfContent);

        echo json_encode(['success' => true, 'fileName' => $filename]);
    } else {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>