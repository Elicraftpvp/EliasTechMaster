<?php
// As configurações de header e erro só são relevantes quando o script é executado diretamente
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    header('Content-Type: application/json');
    ini_set('display_errors', 1);
    error_reporting(E_ALL & ~E_DEPRECATED);
    require 'conexao.php'; 
}

require_once 'pix_helper.php';

$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
}

use Dompdf\Dompdf;
use Dompdf\Options;

/**
 * Função principal refatorada para gerar um PDF e retornar seu conteúdo e nome.
 * Pode ser chamada por outros scripts.
 *
 * @param PDO $pdo A conexão com o banco de dados.
 * @param int $osId O ID da Ordem de Serviço.
 * @return array|null Retorna um array ['content' => ..., 'filename' => ...] ou null em caso de falha.
 */
function gerarPdfParaAnexo(PDO $pdo, int $osId): ?array
{
    // 1. Buscar todos os dados necessários
    $stmt_os = $pdo->prepare("SELECT os.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.email as cliente_email FROM ordens_servico os JOIN clientes c ON os.cliente_id = c.id WHERE os.id = ?");
    $stmt_os->execute([$osId]);
    $data = $stmt_os->fetch(PDO::FETCH_ASSOC);

    if (!$data) {
        return null; // OS não encontrada
    }

    $stmt_servicos = $pdo->prepare("SELECT os_s.*, s.nome as servico_nome FROM os_servicos os_s JOIN servicos s ON os_s.servico_id = s.id WHERE os_s.os_id = ?");
    $stmt_servicos->execute([$osId]);
    $data['servicos'] = $stmt_servicos->fetchAll(PDO::FETCH_ASSOC);

    // 2. Gerar o nome do arquivo
    $equipamentoNome = $data['equipamento'] ?? 'Equipamento';
    $safeEquipamentoNome = preg_replace('/[\s-]+/', '-', $equipamentoNome);
    $safeEquipamentoNome = preg_replace('/[^A-Za-z0-9\-\.]/', '', $safeEquipamentoNome);
    $filename = "OS " . $osId . " - " . $safeEquipamentoNome . ".pdf";

    // 3. Gerar o conteúdo HTML
    $html = gerarConteudoHtmlPdf($data, 'OS-' . $osId);

    // 4. Renderizar o PDF com Dompdf
    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', true);
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    
    // 5. Retornar o conteúdo binário e o nome do arquivo
    return [
        'content' => $dompdf->output(),
        'filename' => $filename
    ];
}


/**
 * Função isolada que apenas gera o HTML do PDF.
 * (Conteúdo da sua função generatePdf original)
 */
function gerarConteudoHtmlPdf(array $data, string $numeroOS): string
{
    // TODO: Cole aqui todo o conteúdo da sua função generatePdf original,
    // desde a linha "$logoHtml = '';" até a linha de fechamento do "</body></html>";"
    // O código é longo, então para não poluir, apenas cole o conteúdo da sua função aqui.
    // O código que você forneceu já está perfeito para esta parte.
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

    $html = "
    <!DOCTYPE html><html><head><meta charset='UTF-8'><style>
        @page { margin: 20px 25px; }
        body { font-family: 'Helvetica', sans-serif; font-size: 11px; color: #333; }
        .header { text-align: center; margin-bottom: 5px; }
        .header h3 { font-size: 16px; margin: 0 0 5px 0; }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .logo-cell { width: 30%; vertical-align: top; }
        .logo-img { max-width: 110px; height: auto; margin-top: -10px; }
        .company-details-cell { width: 70%; text-align: right; vertical-align: top; font-size: 12px; padding-top: 0; line-height: 1.3; }
        .section-title { font-weight: bold; font-size: 13px; color: #51BE41; padding-bottom: 4px; border-bottom: 1.5px solid #51BE41; margin-bottom: 8px; }
        .section-content { margin-top: 0; margin-bottom: 15px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table td { border: 1px solid #ccc; padding: 5px; }
        .info-table td.label { font-weight: bold; width: 100px; background-color: #f2f2f2; }
        .services-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        .services-table th, .services-table td { border: 1px solid #ccc; padding: 5px; text-align: left; }
        .services-table th { background-color: #f2f2f2; font-weight: bold; }
        .total-line { text-align: right; margin-top: 15px; font-size: 15px; font-weight: bold; }
        .pix-section { margin-top: 30px; }
        .pix-table { width: 100%; border-collapse: collapse; }
        .qr-code-cell { width: 150px; padding-right: 15px; vertical-align: top; }
        .pix-details-cell { vertical-align: top; }
        .pix-code { width: calc(100% - 12px); height: 80px; font-size: 10px; padding: 5px; border: 1px solid #ccc; resize: none; word-break: break-all; }
    </style></head><body>
        <div class='header'><h3>Elias TechMaster Reparos - " . htmlspecialchars($numeroOS) . "</h3></div>
        <table class='header-table'><tr><td class='logo-cell'>" . $logoHtml . "</td><td class='company-details-cell'><strong>Rua Pedro Paulo de Abreu, 801</strong><br>Forquilhinhas - São José/SC<br><strong>E-mail:</strong> eliasgkersten@gmail.com<br><strong>Fone:</strong> (48) 99833-9706</td></tr></table>
        <table class='info-table'><tr><td style='width: 50%;'><strong>Nº OS:</strong> " . htmlspecialchars($numeroOS) . "</td><td style='width: 50%;'><strong>Emissão:</strong> " . date('d/m/Y') . "</td></tr></table>
        <div class='section-title'>Dados do Cliente</div>
        <table class='info-table'><tr><td class='label'>Nome:</td><td>" . htmlspecialchars($data['cliente_nome'] ?? 'N/I') . "</td></tr><tr><td class='label'>Telefone:</td><td>" . htmlspecialchars($data['cliente_telefone'] ?? 'N/I') . "</td></tr><tr><td class='label'>E-mail:</td><td>" . htmlspecialchars($data['cliente_email'] ?? 'N/I') . "</td></tr></table>
        <div class='section-title'>Dados do Equipamento</div>
        <table class='info-table'><tr><td class='label'>Equipamento:</td><td>" . htmlspecialchars($data['equipamento'] ?? 'N/I') . "</td></tr></table>
        <div class='section-title'>Problema Informado</div>
        <p class='section-content'>" . nl2br(htmlspecialchars($data['problema_relatado'] ?? 'N/I')) . "</p>
        <div class='section-title'>Laudo Técnico</div>
        <p class='section-content'>" . nl2br(htmlspecialchars($data['laudo_tecnico'] ?? 'N/I')) . "</p>
        <div class='section-title'>Serviços Realizados</div>
        <table class='services-table'><thead><tr><th>Descrição</th><th style='width: 50px;'>Qtd.</th><th style='width: 100px;'>Valor Unit.</th><th style='width: 100px;'>Subtotal</th></tr></thead><tbody>" . $servicosHtml . "</tbody></table>
        <div class='total-line'>TOTAL: R$ " . $totalFormatado . "</div>
        " . $pixHtml . "
    </body></html>";
    return $html;
}


// --- Bloco de Execução Direta ---
// Este código só roda quando o arquivo gerar_pdf.php é acessado diretamente pela URL
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    try {
        $osId = $_GET['id'] ?? null;
        if (!$osId) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID da OS não fornecido.']);
            exit;
        }

        // Gera o PDF em memória usando a nova função
        $pdfData = gerarPdfParaAnexo($pdo, $osId);

        if (!$pdfData) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Ordem de Serviço não encontrada para gerar o PDF.']);
            exit;
        }

        $pdfDir = __DIR__ . '/pdfs';
        if (!is_dir($pdfDir)) mkdir($pdfDir, 0775, true);

        $filepath = $pdfDir . '/' . $pdfData['filename'];
        file_put_contents($filepath, $pdfData['content']);

        echo json_encode(['success' => true, 'fileName' => $pdfData['filename']]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>