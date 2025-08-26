<?php
// Define o cabeçalho para evitar problemas de cache, especialmente com a imagem
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

/**
 * Função para gerar o CRC16 (Checksum) para o payload PIX.
 * @param string $payload O payload completo sem o CRC.
 * @return string O checksum CRC16 de 4 caracteres.
 */
function gerarCRC16($payload) {
    // Adiciona o próprio ID e tamanho do CRC ao payload
    $payload .= "6304";

    // Dados do Polinômio CRC-16-CCITT
    $polinomio = 0x1021;
    $resultado = 0xFFFF;

    // Processa cada byte do payload
    if (($length = strlen($payload)) > 0) {
        for ($offset = 0; $offset < $length; $offset++) {
            $resultado ^= (ord($payload[$offset]) << 8);
            for ($bitwise = 0; $bitwise < 8; $bitwise++) {
                if (($resultado <<= 1) & 0x10000) {
                    $resultado ^= $polinomio;
                }
                $resultado &= 0xFFFF;
            }
        }
    }

    // Retorna o resultado em hexadecimal com 4 caracteres e letras maiúsculas
    return strtoupper(str_pad(dechex($resultado), 4, '0', STR_PAD_LEFT));
}

/**
 * Função para gerar o payload completo do PIX "Copia e Cola".
 * @param string $chave Chave PIX (CPF, CNPJ, Email, Telefone ou Aleatória).
 * @param string $nome Nome do recebedor (até 25 caracteres).
 * @param string $cidade Cidade do recebedor (até 15 caracteres).
 * @param float|null $valor O valor da transação.
 * @param string|null $txid O identificador da transação (antiga descrição).
 * @return string O código PIX completo.
 */
function gerarCodigoPIX($chave, $nome, $cidade, $valor = null, $txid = '***') {
    // Normaliza os dados de entrada
    $nome = mb_substr(strtoupper($nome), 0, 25);
    $cidade = mb_substr(strtoupper($cidade), 0, 15);
    // O txid (descrição) não pode ter espaços ou caracteres especiais.
    $txid = preg_replace('/[^a-zA-Z0-9]/', '', $txid);

    // Início do Payload
    $payload = "000201"; // Payload Format Indicator

    // Merchant Account Information (Obrigatório)
    $gui = "0014BR.GOV.BCB.PIX";
    $chavePIX = "01" . str_pad(strlen($chave), 2, "0", STR_PAD_LEFT) . $chave;
    $merchantAccount = $gui . $chavePIX;
    $payload .= "26" . str_pad(strlen($merchantAccount), 2, "0", STR_PAD_LEFT) . $merchantAccount;

    $payload .= "52040000"; // Merchant Category Code (sempre 0000)
    $payload .= "5303986";  // Transaction Currency (986 = BRL)

    // Valor da Transação (Opcional)
    if ($valor !== null && $valor > 0) {
        $valorFormatado = number_format($valor, 2, '.', '');
        $payload .= "54" . str_pad(strlen($valorFormatado), 2, "0", STR_PAD_LEFT) . $valorFormatado;
    }

    $payload .= "5802BR"; // Country Code
    $payload .= "59" . str_pad(strlen($nome), 2, "0", STR_PAD_LEFT) . $nome; // Merchant Name
    $payload .= "60" . str_pad(strlen($cidade), 2, "0", STR_PAD_LEFT) . $cidade; // Merchant City

    // Additional Data Field (Opcional, usado para o txid)
    $campoAdicional = "05" . str_pad(strlen($txid), 2, "0", STR_PAD_LEFT) . $txid;
    $payload .= "62" . str_pad(strlen($campoAdicional), 2, "0", STR_PAD_LEFT) . $campoAdicional;
    
    // Calcula o CRC16 sobre o payload gerado até aqui
    $crc16 = gerarCRC16($payload);

    // Retorna o payload completo com o CRC
    return $payload . "6304" . $crc16;
}

// --- DADOS PARA O TESTE ---
// A chave telefone precisa estar no formato internacional (+55)
$chave = "+5548998339706"; 
$nome = "ELIAS GUSTAVO KERSTEN";
$cidade = "SAO PAULO";
$valor = 50.00;
$descricao = "Teste"; // Será usado como txid

// Gera o código PIX
$codigoPIX = gerarCodigoPIX($chave, $nome, $cidade, $valor, $descricao);

// Exibe o código "copia e cola"
echo "<h3>Código PIX:</h3>";
echo "<textarea readonly style='width:100%;height:120px;' onclick='this.select();'>$codigoPIX</textarea>";

// --- GERAÇÃO DO QR CODE ---
// CORREÇÃO 1: Usar __DIR__ para garantir que o caminho para a biblioteca esteja correto.
// Certifique-se que a pasta 'phpqrcode' está dentro desta mesma pasta 'php'.
require_once __DIR__ . '/phpqrcode/qrlib.php';

// Define o nome do arquivo de imagem que será gerado
$arquivoQrCode = 'pix_qrcode.png';

// Gera o QR Code e salva no arquivo
QRcode::png($codigoPIX, $arquivoQrCode, QR_ECLEVEL_M, 10, 2);

// Exibe a imagem do QR Code gerado
echo "<h3>QR Code:</h3><img src='$arquivoQrCode' alt='QR Code PIX'>";

?>