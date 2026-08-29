<?php
// Inicia o buffer de saída para evitar vazamento de warnings antes do JSON
ob_start();

if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    header('Content-Type: application/json');
    ini_set('display_errors', 0);
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
 * Gera o PDF da OS com opção de incluir a 2ª página como NFS-e (DANFSe).
 */
function gerarPdfParaAnexo(PDO $pdo, int $osId, bool $incluirNfse = false): ?array
{
    $stmt_os = $pdo->prepare("
        SELECT os.*, 
               c.nome as cliente_nome, 
               c.telefone as cliente_telefone, 
               c.email as cliente_email,
               c.cpf_cnpj as cliente_cpf,
               c.endereco as cliente_endereco 
        FROM ordens_servico os 
        JOIN clientes c ON os.cliente_id = c.id 
        WHERE os.id = ?
    ");
    $stmt_os->execute([$osId]);
    $data = $stmt_os->fetch(PDO::FETCH_ASSOC);

    if (!$data) return null;

    $stmt_servicos = $pdo->prepare("
        SELECT os_s.*, 
               os_s.nome_item as servico_nome, 
               os_s.tipo_item as servico_tipo 
        FROM os_servicos os_s 
        WHERE os_s.os_id = ?
    ");
    $stmt_servicos->execute([$osId]);
    $data['servicos'] = $stmt_servicos->fetchAll(PDO::FETCH_ASSOC);

    $stmt_pix = $pdo->prepare("SELECT chave, valor FROM configuracoes WHERE chave IN ('pix_chave', 'pix_nome', 'pix_cidade')");
    $stmt_pix->execute();
    $pix_raw = $stmt_pix->fetchAll(PDO::FETCH_KEY_PAIR);
    $data['pix_config'] = [
        'chave' => $pix_raw['pix_chave'] ?? '',
        'nome' => $pix_raw['pix_nome'] ?? '',
        'cidade' => $pix_raw['pix_cidade'] ?? ''
    ];

    $equipamentoNome = $data['equipamento'] ?? 'Equipamento';
    $safeEquipamentoNome = preg_replace('/[\s-]+/', '-', $equipamentoNome);
    $safeEquipamentoNome = preg_replace('/[^A-Za-z0-9\-\.]/', '', $safeEquipamentoNome);
    
    $suffix = $incluirNfse ? "-NFSe" : "";
    $filename = "OS " . $osId . " - " . $safeEquipamentoNome . $suffix . ".pdf";

    $html = gerarConteudoHtmlPdf($data, 'OS-' . $osId, $incluirNfse);

    $options = new Options();
    $options->set('isHtml5ParserEnabled', true);
    $options->set('isRemoteEnabled', true);
    $options->set('defaultFont', 'Helvetica');
    $dompdf = new Dompdf($options);
    $dompdf->loadHtml($html);
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();
    
    return [
        'content' => $dompdf->output(),
        'filename' => $filename
    ];
}

/**
 * Gera o HTML completo do PDF (Página 1: OS, Página 2: NFS-e opcional).
 */
function gerarConteudoHtmlPdf(array $data, string $numeroOS, bool $incluirNfse = false): string
{
    $logoHtml = '';
    $imagePath = __DIR__ . '/../images/logo.jpg'; 
    if (file_exists($imagePath)) {
        $imageData = base64_encode(file_get_contents($imagePath));
        $imageMime = function_exists('mime_content_type') ? mime_content_type($imagePath) : 'image/jpeg';
        $logoSrc = 'data:' . $imageMime . ';base64,' . $imageData;
        $logoHtml = "<img src='" . $logoSrc . "' alt='Logo' class='logo-img'>";
    }

    $servicosHtml = '';
    $runningTotal = 0;
    $totalBruto = 0;
    $totalDescontos = 0;

    foreach ($data['servicos'] ?? [] as $servico) {
        $descricaoServico = htmlspecialchars($servico['servico_nome'] ?? 'Serviço');
        $qtd = (int)($servico['quantidade'] ?? 1);
        $tipo = $servico['servico_tipo'] ?? 'servico';
        
        $valorUnit = (float)($servico['valor_unitario'] ?? 0);
        $subtotalItem = (float)($servico['subtotal'] ?? 0);
        
        $impacto = 0;
        if ($tipo === 'desconto_percentual') {
            $valorUnitarioStr = number_format($valorUnit, 2, ',', '.') . '%';
            $impacto = -($runningTotal * ($valorUnit / 100));
            $totalDescontos += abs($impacto);
        } elseif ($tipo === 'desconto_fixo') {
            $valorUnitarioStr = 'R$ -' . number_format($valorUnit, 2, ',', '.');
            $impacto = -($valorUnit * $qtd);
            $totalDescontos += abs($impacto);
        } else {
            $valorUnitarioStr = 'R$ ' . number_format($valorUnit, 2, ',', '.');
            $impacto = ($valorUnit * $qtd);
            $totalBruto += $impacto;
        }

        $runningTotal += $impacto;
        $subtotalStr = 'R$ ' . number_format($runningTotal, 2, ',', '.');

        $servicosHtml .= "<tr><td>$descricaoServico</td><td>$qtd</td><td>$valorUnitarioStr</td><td>$subtotalStr</td></tr>";
    }
    
    $totalFloat = (float) ($data['valor_total'] ?? $data['total'] ?? $runningTotal);
    $totalFormatado = number_format($totalFloat, 2, ',', '.');

    // Seção PIX na Página 1
    $pixHtml = '';
    if ($totalFloat > 0 && !empty($data['pix_config']['chave'])) {
        $chavePix = $data['pix_config']['chave'];
        $nomeBeneficiario = $data['pix_config']['nome'];
        $cidadeBeneficiario = $data['pix_config']['cidade'];
        $txid = preg_replace('/[^a-zA-Z0-9]/', '', $numeroOS);
        $codigoPix = gerarCodigoPIX($chavePix, $nomeBeneficiario, $cidadeBeneficiario, $totalFloat, $txid);
        $qrCodeBase64 = gerarQRCodeBase64($codigoPix);

        $qrImgTag = !empty($qrCodeBase64) 
            ? "<img src='$qrCodeBase64' style='width: 135px; height: 135px; display: block;'>" 
            : "<div style='width: 135px; height: 135px; border: 1px dashed #ccc; text-align: center; line-height: 135px;'>QR Code</div>";

        $pixHtml = "
            <div class='pix-section'>
                <div class='section-title'>Pagamento via PIX</div>
                <table class='pix-table'>
                    <tr>
                        <td class='qr-code-cell'>$qrImgTag</td>
                        <td class='pix-details-cell'>
                            <strong>PIX Copia e Cola:</strong>
                            <textarea readonly class='pix-code'>$codigoPix</textarea>
                            <small style='color: #666;'>Aponte a câmera do seu celular para o QR Code ou use o código acima.</small>
                        </td>
                    </tr>
                </table>
            </div>
        ";
    }

    // Página 2: NFS-e (DANFSe v1.0)
    $nfseHtml = '';
    if ($incluirNfse) {
        $osNumApenas = preg_replace('/[^0-9]/', '', $numeroOS);
        $chaveAcesso = "4226" . str_pad($osNumApenas, 4, '0', STR_PAD_LEFT) . "489983390001705500100000" . str_pad($osNumApenas, 8, '0', STR_PAD_LEFT) . "1001";
        $chaveFormatada = wordwrap($chaveAcesso, 4, ' ', true);
        
        $numNfse = "2026" . str_pad($osNumApenas, 6, '0', STR_PAD_LEFT);
        $dataEmissao = date('d/m/Y');
        $horaEmissao = date('H:i:s');
        $dataHoraCompleta = date('d/m/Y H:i:s');
        $numDps = str_pad($osNumApenas, 6, '0', STR_PAD_LEFT);

        $clienteNome = htmlspecialchars($data['cliente_nome'] ?? 'Consumidor Final');
        $clienteTelefone = htmlspecialchars($data['cliente_telefone'] ?? 'Não informado');
        $clienteEmail = htmlspecialchars($data['cliente_email'] ?? 'Não informado');
        $clienteCpf = htmlspecialchars(!empty($data['cliente_cpf']) ? $data['cliente_cpf'] : 'Não informado');
        $clienteEndereco = htmlspecialchars(!empty($data['cliente_endereco']) ? $data['cliente_endereco'] : 'São José - SC');

        $equipamento = htmlspecialchars($data['equipamento'] ?? 'Equipamento');
        $laudo = htmlspecialchars($data['laudo_tecnico'] ?? '');

        // QR Code de Verificação Interna (Sem Valor Fiscal)
        $qrPayloadInterno = "COMPROVANTE AUXILIAR DE SERVICOS | OS: " . $numeroOS . " | CLIENTE: " . $clienteNome . " | VALOR: R$ " . $totalFormatado . " | DATA: " . $dataHoraCompleta . " | DOCUMENTO SEM VALIDADE FISCAL";
        $qrAutenticidadeBase64 = gerarQRCodeBase64($qrPayloadInterno);
        $qrNfseTag = !empty($qrAutenticidadeBase64) 
            ? "<img src='$qrAutenticidadeBase64' style='width: 85px; height: 85px;'>" 
            : "";

        // Serviços para a tabela da NFSe
        $linhasServicosNfse = '';
        foreach ($data['servicos'] ?? [] as $s) {
            $desc = htmlspecialchars($s['servico_nome'] ?? 'Serviço de Manutenção');
            $qtd = (int)($s['quantidade'] ?? 1);
            $vUnit = number_format((float)($s['valor_unitario'] ?? 0), 2, ',', '.');
            $sub = number_format((float)($s['subtotal'] ?? 0), 2, ',', '.');
            $linhasServicosNfse .= "<tr><td>$desc</td><td style='text-align: center;'>$qtd</td><td style='text-align: right;'>R$ $vUnit</td><td style='text-align: right;'>R$ $sub</td></tr>";
        }

        $nfseHtml = "
        <div style='page-break-before: always;'></div>
        <div class='nfse-page-wrapper' style='position: relative;'>
            <div class='watermark-nfse'>ESTE DOCUMENTO NÃO TEM VALIDADE FISCAL</div>
            <div class='nfse-container'>
            
            <!-- TARJA DE ALERTA NO TOPO -->
            <div class='nfse-aviso-topo'>⚠ DOCUMENTO AUXILIAR DE PRESTAÇÃO DE SERVIÇOS — SEM VALIDADE FISCAL ⚠</div>

            <!-- CABEÇALHO DEMONSTRATIVO -->
            <table class='nfse-header-table'>
                <tr>
                    <td style='width: 25%; vertical-align: middle;'>
                        <span class='nfse-logo-title'>RECIBO</span><br>
                        <span style='font-size: 8px; font-weight: bold; color: #b71c1c;'>SEM VALIDADE FISCAL</span>
                    </td>
                    <td style='width: 50%; text-align: center; vertical-align: middle;'>
                        <span style='font-size: 13px; font-weight: bold;'>DEMONSTRATIVO DE SERVIÇOS</span><br>
                        <span style='font-size: 9px; color: #444;'>Documento Auxiliar e Comprovante de Atendimento</span>
                    </td>
                    <td style='width: 25%; text-align: right; vertical-align: middle;'>
                        <strong style='font-size: 9px;'>Elias TechMaster Reparos</strong><br>
                        <span style='font-size: 8px; color: #666;'>Controle Interno e Garantia</span>
                    </td>
                </tr>
            </table>

            <!-- CÓDIGO DE CONTROLE E DADOS -->
            <table class='nfse-box-table' style='margin-top: 5px;'>
                <tr>
                    <td style='width: 75%; vertical-align: top; padding: 4px 6px;'>
                        <span class='nfse-field-label'>Código de Controle Interno da OS</span>
                        <div class='nfse-chave'>$chaveFormatada</div>
                        <table style='width: 100%; margin-top: 4px; border-collapse: collapse;'>
                            <tr>
                                <td style='width: 25%;'>
                                    <span class='nfse-field-label'>Número do Recibo</span>
                                    <div class='nfse-field-val'>REC-$numNfse</div>
                                </td>
                                <td style='width: 25%;'>
                                    <span class='nfse-field-label'>Data do Serviço</span>
                                    <div class='nfse-field-val'>$dataEmissao</div>
                                </td>
                                <td style='width: 50%;'>
                                    <span class='nfse-field-label'>Data e Hora da Emissão</span>
                                    <div class='nfse-field-val'>$dataHoraCompleta</div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <span class='nfse-field-label'>Ordem de Serviço</span>
                                    <div class='nfse-field-val'>OS #$osNumApenas</div>
                                </td>
                                <td>
                                    <span class='nfse-field-label'>Série</span>
                                    <div class='nfse-field-val'>INT-01</div>
                                </td>
                                <td>
                                    <span class='nfse-field-label'>Finalidade</span>
                                    <div class='nfse-field-val' style='color: #b71c1c; font-weight: bold;'>Comprovante Não Fiscal</div>
                                </td>
                            </tr>
                        </table>
                    </td>
                    <td style='width: 25%; text-align: center; vertical-align: middle; padding: 4px;'>
                        $qrNfseTag
                        <div style='font-size: 7px; color: #b71c1c; font-weight: bold; margin-top: 2px;'>Comprovante Interno</div>
                    </td>
                </tr>
            </table>

            <!-- EMITENTE -->
            <div class='nfse-section-bar'>PRESTADOR DO SERVIÇO (Emitente)</div>
            <table class='nfse-box-table'>
                <tr>
                    <td style='width: 60%;'>
                        <span class='nfse-field-label'>Nome / Razão Social</span>
                        <div class='nfse-field-val'><strong>ELIAS TECH MASTER REPAROS DE COMPUTADORES</strong></div>
                    </td>
                    <td style='width: 20%;'>
                        <span class='nfse-field-label'>CNPJ / CPF</span>
                        <div class='nfse-field-val'>48.998.339/0001-70</div>
                    </td>
                    <td style='width: 20%;'>
                        <span class='nfse-field-label'>Inscrição Municipal</span>
                        <div class='nfse-field-val'>8920144-2</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <span class='nfse-field-label'>Endereço</span>
                        <div class='nfse-field-val'>Rua Pedro Paulo de Abreu, 801 - Forquilhinhas</div>
                    </td>
                    <td>
                        <span class='nfse-field-label'>Município / UF</span>
                        <div class='nfse-field-val'>São José - SC</div>
                    </td>
                    <td>
                        <span class='nfse-field-label'>CEP</span>
                        <div class='nfse-field-val'>88106-500</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <span class='nfse-field-label'>E-mail</span>
                        <div class='nfse-field-val'>eliasgkersten@gmail.com</div>
                    </td>
                    <td>
                        <span class='nfse-field-label'>Telefone</span>
                        <div class='nfse-field-val'>(48) 99833-9706</div>
                    </td>
                    <td>
                        <span class='nfse-field-label'>Regime Tributário</span>
                        <div class='nfse-field-val'>Simples Nacional / MEI</div>
                    </td>
                </tr>
            </table>

            <!-- TOMADOR DO SERVIÇO -->
            <div class='nfse-section-bar'>TOMADOR DO SERVIÇO (Cliente)</div>
            <table class='nfse-box-table'>
                <tr>
                    <td style='width: 60%;'>
                        <span class='nfse-field-label'>Nome / Razão Social</span>
                        <div class='nfse-field-val'><strong>$clienteNome</strong></div>
                    </td>
                    <td style='width: 20%;'>
                        <span class='nfse-field-label'>CNPJ / CPF</span>
                        <div class='nfse-field-val'>$clienteCpf</div>
                    </td>
                    <td style='width: 20%;'>
                        <span class='nfse-field-label'>Telefone</span>
                        <div class='nfse-field-val'>$clienteTelefone</div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <span class='nfse-field-label'>Endereço</span>
                        <div class='nfse-field-val'>$clienteEndereco</div>
                    </td>
                    <td>
                        <span class='nfse-field-label'>Município / UF</span>
                        <div class='nfse-field-val'>São José - SC</div>
                    </td>
                    <td>
                        <span class='nfse-field-label'>E-mail</span>
                        <div class='nfse-field-val'>$clienteEmail</div>
                    </td>
                </tr>
            </table>

            <!-- SERVIÇO PRESTADO -->
            <div class='nfse-section-bar'>SERVIÇO PRESTADO</div>
            <table class='nfse-box-table'>
                <tr>
                    <td colspan='2'>
                        <span class='nfse-field-label'>Código de Tributação Nacional</span>
                        <div class='nfse-field-val'><strong>14.01.01</strong> - Lubrificação, limpeza, lustração, revisão, conserto, restauração, manutenção e conservação de máquinas e equipamentos de informática e tecnologia.</div>
                    </td>
                </tr>
                <tr>
                    <td style='width: 50%;'>
                        <span class='nfse-field-label'>Local da Prestação</span>
                        <div class='nfse-field-val'>São José - SC</div>
                    </td>
                    <td style='width: 50%;'>
                        <span class='nfse-field-label'>País da Prestação</span>
                        <div class='nfse-field-val'>Brasil</div>
                    </td>
                </tr>
            </table>

            <!-- TABELA DE ITENS DA NFSE -->
            <table class='nfse-items-table' style='margin-top: 4px;'>
                <thead>
                    <tr>
                        <th>Descrição dos Serviços / Peças</th>
                        <th style='width: 40px; text-align: center;'>Qtd.</th>
                        <th style='width: 80px; text-align: right;'>Valor Unit.</th>
                        <th style='width: 80px; text-align: right;'>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    $linhasServicosNfse
                </tbody>
            </table>

            <!-- TRIBUTAÇÃO E VALORES -->
            <div class='nfse-section-bar'>TRIBUTAÇÃO MUNICIPAL & VALORES DA NFS-e</div>
            <table class='nfse-box-table'>
                <tr>
                    <td style='width: 30%;'>
                        <span class='nfse-field-label'>Tributação do ISSQN</span>
                        <div class='nfse-field-val'>Operação Tributável / MEI</div>
                    </td>
                    <td style='width: 20%;'>
                        <span class='nfse-field-label'>Alíquota</span>
                        <div class='nfse-field-val'>0,00% (MEI)</div>
                    </td>
                    <td style='width: 25%;'>
                        <span class='nfse-field-label'>ISSQN Retido</span>
                        <div class='nfse-field-val'>Não Retido</div>
                    </td>
                    <td style='width: 25%;'>
                        <span class='nfse-field-label'>ISSQN Apurado</span>
                        <div class='nfse-field-val'>R$ 0,00</div>
                    </td>
                </tr>
            </table>

            <table class='nfse-total-table' style='margin-top: 4px;'>
                <tr>
                    <td style='width: 33%;'>
                        <span class='nfse-field-label'>Valor Total dos Serviços</span>
                        <div style='font-size: 11px; font-weight: bold;'>R$ $totalFormatado</div>
                    </td>
                    <td style='width: 33%;'>
                        <span class='nfse-field-label'>Desconto Incondicionado</span>
                        <div style='font-size: 11px; font-weight: bold;'>R$ " . number_format($totalDescontos, 2, ',', '.') . "</div>
                    </td>
                    <td style='width: 34%; background: #e8f5e9; text-align: right;'>
                        <span class='nfse-field-label' style='color: #1b5e20;'>VALOR LÍQUIDO DA NFS-e</span>
                        <div style='font-size: 14px; font-weight: bold; color: #1b5e20;'>R$ $totalFormatado</div>
                    </td>
                </tr>
            </table>

            <!-- INFORMAÇÕES COMPLEMENTARES -->
            <div class='nfse-section-bar' style='margin-top: 6px;'>INFORMAÇÕES COMPLEMENTARES & TERMO DE GARANTIA</div>
            <table class='nfse-box-table'>
                <tr>
                    <td style='font-size: 8px; line-height: 1.3; color: #444;'>
                        • <strong>Equipamento Atendido:</strong> $equipamento | <strong>Nº OS:</strong> $numeroOS<br>
                        " . (!empty($laudo) ? "• <strong>Laudo Técnico:</strong> $laudo<br>" : "") . "
                        • <strong>Garantia dos Serviços:</strong> 90 dias a partir da data de entrega, cobrindo exclusivamente os serviços executados e peças trocadas constantes neste demonstrativo.<br>
                        <div style='margin-top: 4px; padding: 4px; background: #fff3cd; border: 1px solid #ffeeba; color: #856404; font-weight: bold; font-size: 7.5px;'>
                            ⚠ ATENÇÃO: ESTE DOCUMENTO CONSTITUI APENAS UM RECIBO TÉCNICO AUXILIAR PARA CONTROLE INTERNO DO CLIENTE E PRESTADOR. NÃO POSSUI VALOR DE DOCUMENTO FISCAL E NÃO SUBSTITUI A NOTA FISCAL DE SERVIÇOS ELETRÔNICA (NFS-e).
                        </div>
                    </td>
                </tr>
            </table>
            </div>
        </div>
        ";
    }

    return "
    <!DOCTYPE html><html><head><meta charset='UTF-8'><style>
        @page { margin: 20px 25px; }
        body { font-family: 'Helvetica', sans-serif; font-size: 11px; color: #333; }
        
        /* PÁGINA 1: OS */
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
        .pix-section { margin-top: 25px; }
        .pix-table { width: 100%; border-collapse: collapse; }
        .qr-code-cell { width: 145px; padding-right: 15px; vertical-align: top; }
        .pix-details-cell { vertical-align: top; }
        .pix-code { width: calc(100% - 12px); height: 75px; font-size: 9px; padding: 5px; border: 1px solid #ccc; resize: none; word-break: break-all; }

        /* MARCA D'ÁGUA */
        .watermark-nfse {
            position: absolute;
            top: 400px;
            left: -80px;
            right: -80px;
            text-align: center;
            transform: rotate(-30deg);
            -webkit-transform: rotate(-30deg);
            font-size: 30px;
            font-weight: bold;
            color: rgba(200, 40, 40, 0.16);
            letter-spacing: 4px;
            text-transform: uppercase;
            z-index: 1000;
            pointer-events: none;
        }

        /* PÁGINA 2: DEMONSTRATIVO / RECIBO */
        .nfse-page-wrapper { position: relative; }
        .nfse-container { font-size: 9px; color: #000; position: relative; z-index: 10; }
        .nfse-aviso-topo {
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            color: #856404;
            text-align: center;
            font-weight: bold;
            font-size: 8px;
            padding: 3px 5px;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
        }
        .nfse-header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 4px; }
        .nfse-logo-title { font-size: 22px; font-weight: bold; color: #1c7430; letter-spacing: -0.5px; }
        .nfse-box-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 4px; }
        .nfse-box-table td { border: 1px solid #777; padding: 3px 5px; vertical-align: top; }
        .nfse-section-bar { background-color: #f0f0f0; border: 1px solid #000; border-bottom: none; font-size: 9px; font-weight: bold; padding: 3px 6px; margin-top: 5px; text-transform: uppercase; }
        .nfse-field-label { font-size: 7.5px; font-weight: bold; color: #555; text-transform: uppercase; display: block; margin-bottom: 1px; }
        .nfse-field-val { font-size: 9px; }
        .nfse-chave { font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 0.5px; margin-top: 2px; }
        .nfse-items-table { width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 4px; }
        .nfse-items-table th { background-color: #f0f0f0; border: 1px solid #777; padding: 3px 5px; font-size: 8.5px; text-align: left; }
        .nfse-items-table td { border: 1px solid #ccc; padding: 3px 5px; font-size: 8.5px; }
        .nfse-total-table { width: 100%; border-collapse: collapse; border: 1.5px solid #1b5e20; }
        .nfse-total-table td { padding: 4px 6px; }
    </style></head><body>
        <!-- PÁGINA 1: ORDEM DE SERVIÇO -->
        <div class='header'><h3>Elias TechMaster Reparos - " . htmlspecialchars($numeroOS) . "</h3></div>
        <table class='header-table'><tr><td class='logo-cell'>$logoHtml</td><td class='company-details-cell'><strong>Rua Pedro Paulo de Abreu, 801</strong><br>Forquilhinhas - São José/SC<br><strong>E-mail:</strong> eliasgkersten@gmail.com<br><strong>Fone:</strong> (48) 99833-9706</td></tr></table>
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
        <table class='services-table'><thead><tr><th>Descrição</th><th style='width: 50px;'>Qtd.</th><th style='width: 100px;'>Valor Unit.</th><th style='width: 100px;'>Subtotal</th></tr></thead><tbody>$servicosHtml</tbody></table>
        <div class='total-line'>TOTAL: R$ $totalFormatado</div>
        $pixHtml

        <!-- PÁGINA 2 (OPCIONAL): NFS-e -->
        $nfseHtml
    </body></html>";
}

// Execução direta pela URL (API)
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    try {
        $osId = (int)($_GET['id'] ?? 0);
        if (!$osId) {
            ob_clean();
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID da OS não fornecido.']);
            exit;
        }

        $incluirNfse = isset($_GET['nfse']) && in_array(strtolower((string)$_GET['nfse']), ['1', 'true', 'sim', 's']);
        
        $pdfData = gerarPdfParaAnexo($pdo, $osId, $incluirNfse);
        if (!$pdfData) {
            ob_clean();
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'OS não encontrada.']);
            exit;
        }

        $pdfDir = __DIR__ . '/pdfs';
        if (!is_dir($pdfDir)) mkdir($pdfDir, 0775, true);
        file_put_contents($pdfDir . '/' . $pdfData['filename'], $pdfData['content']);

        ob_clean();
        echo json_encode([
            'success' => true, 
            'fileName' => $pdfData['filename'],
            'nfse' => $incluirNfse
        ]);
    } catch (\Throwable $e) {
        ob_clean();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}
?>