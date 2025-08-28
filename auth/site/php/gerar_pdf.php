<?php
header('Content-Type: application/json');
ini_set('display_errors', 1);
// Reporta todos os erros, EXCETO os avisos de "deprecated".
error_reporting(E_ALL & ~E_DEPRECATED);

require 'conexao.php'; 
require 'pix_helper.php';

// Verifica se o autoload do Composer existe
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Arquivo autoload.php do Composer não encontrado.']);
    exit;
}
require $autoloadPath;

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Gera o conteúdo HTML e o converte para PDF.
 * @param array $data Dados da OS, cliente e serviços.
 *param string $numeroOS Número formatado da Ordem de Serviço.
 * @return string Conteúdo binário do PDF.
 */
function generatePdf(array $data, string $numeroOS) {
    $logoHtml = '';
    $imagePath = __DIR__ . '/../images/logo.jpg'; 

    if (file_exists($imagePath)) {
        $imageData = base64_encode(file_get_contents($imagePath));
        $imageMime = mime_content_type($imagePath);
        $logoSrc = 'data:' . $imageMime . ';base64,' . $imageData;
        $logoHtml = "<img src='" . $logoSrc . "' alt='Logo' class='logo-img'>";
    }

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
    
    $totalFloat = (float) ($data['valor_total'] ?? $data['total'] ?? 0);
    $totalFormatado = number_format($totalFloat, 2, ',', '.');

    $pixHtml = '';
    if ($totalFloat > 0) {
        $chavePix = "+5548998339706";
        $nomeBeneficiario = "ELIAS GUSTAVO KERSTEN";
        $cidadeBeneficiario = "SAO JOSE";
        $txid = preg_replace('/[^a-zA-Z0-9]/', '', $numeroOS);
        $codigoPix = gerarCodigoPIX($chavePix, $nomeBeneficiario, $cidadeBeneficiario, $totalFloat, $txid);
        $qrCodeBase64 = gerarQRCodeBase64($codigoPix);

        $pixHtml = "
            <div class='pix-section'>
                <div class='section-title'>Pagamento via PIX</div>
                <table class='pix-table'>
                    <tr>
                        <td class='qr-code-cell'>
                            <img src='" . $qrCodeBase64 . "' alt='QR Code PIX' style='width: 140px; height: 140px;'>
                        </td>
                        <td class='pix-details-cell'>
                            <strong>PIX Copia e Cola:</strong>
                            <textarea readonly class='pix-code'>" . $codigoPix . "</textarea>
                            <small>Aponte a câmera do seu celular para o QR Code ou use o código acima.</small>
                        </td>
                    </tr>
                </table>
            </div>
        ";
    }

    // A tag <style> abaixo contém todas as modificações para compactar o layout.
    $html = "
    <!DOCTYPE html><html><head><meta charset='UTF-8'><style>
        @page { margin: 20px 25px; } /* MODIFICAÇÃO: Margens da página bem reduzidas */

        body { font-family: 'Helvetica', sans-serif; font-size: 11px; color: #333; } /* MODIFICAÇÃO: Fonte ligeiramente menor para caber mais conteúdo */
        
        .header { text-align: center; margin-bottom: 5px; } /* MODIFICAÇÃO: Margem inferior reduzida */
        
        .header h3 {
            font-size: 16px;
            margin: 0 0 5px 0; /* MODIFICAÇÃO: Margem inferior reduzida */
        }

        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; } /* MODIFICAÇÃO: Margem inferior reduzida */
        .logo-cell { width: 30%; vertical-align: top; }
        .logo-img { max-width: 110px; height: auto; margin-top: -10px; } /* MODIFICAÇÃO: Ajuste fino no logo */
        .company-details-cell { 
            width: 70%; 
            text-align: right; 
            vertical-align: top; 
            font-size: 12px; /* MODIFICAÇÃO: Tamanho da fonte ajustado */
            padding-top: 0; /* MODIFICAÇÃO: Removido padding superior */
            line-height: 1.3; /* MODIFICAÇÃO: Altura da linha ajustada */
        }

        .section-title { font-weight: bold; font-size: 13px; color: #51BE41; padding-bottom: 4px; border-bottom: 1.5px solid #51BE41; margin-bottom: 8px; } /* MODIFICAÇÃO: Estilo geral ajustado */
        
        .section-content { margin-top: 0; margin-bottom: 15px; } /* MODIFICAÇÃO: Classe para controlar espaçamento dos parágrafos */

        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; } /* MODIFICAÇÃO: Margem inferior reduzida */
        .info-table td { border: 1px solid #ccc; padding: 5px; } /* MODIFICAÇÃO: Padding reduzido */
        .info-table td.label { font-weight: bold; width: 100px; background-color: #f2f2f2; } 
        
        .services-table { width: 100%; border-collapse: collapse; margin-top: 5px; } /* MODIFICAÇÃO: Margem superior reduzida */
        .services-table th, .services-table td { border: 1px solid #ccc; padding: 5px; text-align: left; } /* MODIFICAÇÃO: Padding reduzido */
        .services-table th { background-color: #f2f2f2; font-weight: bold; } 
        
        .total-line { text-align: right; margin-top: 15px; font-size: 15px; font-weight: bold; } /* MODIFICAÇÃO: Margem e fonte ajustadas */
        
        .pix-section { margin-top: 30px; } /* MODIFICAÇÃO: Margem superior ajustada */
        .pix-table { width: 100%; border-collapse: collapse; }
        .qr-code-cell { width: 150px; padding-right: 15px; vertical-align: top; }
        .pix-details-cell { vertical-align: top; }
        .pix-code { width: calc(100% - 12px); height: 80px; font-size: 10px; padding: 5px; border: 1px solid #ccc; resize: none; word-break: break-all; }
    </style></head><body>
        
        <div class='header'>
            <h3>Elias TechMaster Reparos - " . htmlspecialchars($numeroOS) . "</h3>
        </div>
        
        <table class='header-table'>
            <tr>
                <td class='logo-cell'>
                    " . $logoHtml . "
                </td>
                <td class='company-details-cell'>
                    <strong>Rua Pedro Paulo de Abreu, 801</strong><br>
                    Forquilhinhas - São José/SC<br>
                    <strong>E-mail:</strong> eliasgkersten@gmail.com<br>
                    <strong>Fone:</strong> (48) 99833-9706
                </td>
            </tr>
        </table>

        <table class='info-table'><tr><td style='width: 50%;'><strong>Nº OS:</strong> " . htmlspecialchars($numeroOS) . "</td><td style='width: 50%;'><strong>Emissão:</strong> " . date('d/m/Y') . "</td></tr></table>
        
        <div class='section-title'>Dados do Cliente</div>
        <table class='info-table'>
            <tr><td class='label'>Nome:</td><td>" . htmlspecialchars($data['cliente_nome'] ?? $data['clienteNome'] ?? 'Não informado') . "</td></tr>
            <tr><td class='label'>Telefone:</td><td>" . htmlspecialchars($data['cliente_telefone'] ?? $data['clienteTelefone'] ?? 'Não informado') . "</td></tr>
            <tr><td class='label'>E-mail:</td><td>" . htmlspecialchars($data['cliente_email'] ?? $data['clienteEmail'] ?? 'Não informado') . "</td></tr>
        </table>
        
        <div class='section-title'>Dados do Equipamento</div>
        <table class='info-table'><tr><td class='label'>Equipamento:</td><td>" . htmlspecialchars($data['equipamento'] ?? 'Não informado') . "</td></tr></table>
        
        <div class='section-title'>Problema Informado</div>
        <p class='section-content'>" . nl2br(htmlspecialchars($data['problema_relatado'] ?? $data['problema'] ?? 'Não informado')) . "</p>
        
        <div class='section-title'>Laudo Técnico</div>
        <p class='section-content'>" . nl2br(htmlspecialchars($data['laudo_tecnico'] ?? $data['laudo'] ?? 'Não informado')) . "</p>
        
        <div class='section-title'>Serviços Realizados</div>
        <table class='services-table'><thead><tr><th>Descrição</th><th style='width: 50px;'>Qtd.</th><th style='width: 100px;'>Valor Unit.</th><th style='width: 100px;'>Subtotal</th></tr></thead><tbody>" . $servicosHtml . "</tbody></table>
        
        <div class='total-line'>TOTAL: R$ " . $totalFormatado . "</div>
        
        " . $pixHtml . "
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

        $pdfDir = __DIR__ . '/pdfs';
        if (is_dir($pdfDir)) {
            foreach (glob($pdfDir . "/*.pdf") as $oldFile) {
                if(time() - filemtime($oldFile) > 300) { 
                    unlink($oldFile);
                }
            }
        }
        
        $stmt_os = $pdo->prepare("SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE os.id = ?");
        $stmt_os->execute([$osId]);
        $data = $stmt_os->fetch(PDO::FETCH_ASSOC);

        if (!$data) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Ordem de Serviço não encontrada no banco de dados.']);
            exit;
        }

        $equipamentoNome = $data['equipamento'] ?? 'Equipamento';
        $safeEquipamentoNome = preg_replace('/[\s-]+/', '-', $equipamentoNome);
        $safeEquipamentoNome = preg_replace('/[^A-Za-z0-9\-\.]/', '', $safeEquipamentoNome);
        $filename = "OS " . $osId . " - " . $safeEquipamentoNome . ".pdf";
        $filepath = $pdfDir . '/' . $filename;

        $stmt_servicos = $pdo->prepare("SELECT os_s.*, s.nome as servico_nome FROM os_servicos os_s JOIN servicos s ON os_s.servico_id = s.id WHERE os_s.os_id = ?");
        $stmt_servicos->execute([$osId]);
        $data['servicos'] = $stmt_servicos->fetchAll(PDO::FETCH_ASSOC);

        // O prefixo "OS-" é adicionado aqui, antes de passar para a função
        $pdfContent = generatePdf($data, 'OS-' . $osId);
        
        if (!is_dir($pdfDir)) mkdir($pdfDir, 0775, true);
        file_put_contents($filepath, $pdfContent);
        
        if (strtoupper(substr(PHP_OS, 0, 3)) !== 'WIN') {
            $segundosParaExcluir = 15;
            $safeFilepath = escapeshellarg($filepath);
            $command = "(sleep " . $segundosParaExcluir . " && rm " . $safeFilepath . ") > /dev/null 2>&1 &";
            shell_exec($command);
        }
        
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