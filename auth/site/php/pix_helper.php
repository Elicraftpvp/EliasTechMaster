<?php
// pix_helper.php

/**
 * =======================================================================
 * BIBLIOTECA QR CODE (Endroid via Composer)
 * =======================================================================
 */
$autoloadPath = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require_once $autoloadPath;
}

/**
 * Calcula o CRC16 para o payload PIX.
 * @param string $payload
 * @return string
 */
function gerarCRC16($payload) {
    $payload .= "6304";
    $polinomio = 0x1021;
    $resultado = 0xFFFF;

    $length = strlen($payload);
    for ($offset = 0; $offset < $length; $offset++) {
        $resultado ^= (ord($payload[$offset]) << 8);
        for ($bitwise = 0; $bitwise < 8; $bitwise++) {
            if (($resultado <<= 1) & 0x10000) {
                $resultado ^= $polinomio;
            }
            $resultado &= 0xFFFF;
        }
    }
    return strtoupper(str_pad(dechex($resultado), 4, '0', STR_PAD_LEFT));
}

/**
 * Gera o payload completo do PIX (código "copia e cola").
 * @param string $chave
 * @param string $nome
 * @param string $cidade
 * @param float $valor
 * @param string $txid
 * @return string
 */
function gerarCodigoPIX($chave, $nome, $cidade, $valor, $txid = '***') {
    $nome = mb_substr(preg_replace('/[^a-zA-Z0-9\s]/', '', $nome), 0, 25);
    $cidade = mb_substr(preg_replace('/[^a-zA-Z0-9\s]/', '', $cidade), 0, 15);
    $txid = preg_replace('/[^a-zA-Z0-9]/', '', $txid);

    $payload = "000201";
    $merchantAccount = "0014BR.GOV.BCB.PIX" . "01" . str_pad(strlen($chave), 2, "0", STR_PAD_LEFT) . $chave;
    $payload .= "26" . str_pad(strlen($merchantAccount), 2, "0", STR_PAD_LEFT) . $merchantAccount;
    $payload .= "52040000";
    $payload .= "5303986";

    if ($valor !== null && is_numeric($valor) && $valor > 0) {
        $valorFormatado = number_format($valor, 2, '.', '');
        $payload .= "54" . str_pad(strlen($valorFormatado), 2, "0", STR_PAD_LEFT) . $valorFormatado;
    }

    $payload .= "5802BR";
    $payload .= "59" . str_pad(strlen($nome), 2, "0", STR_PAD_LEFT) . $nome;
    $payload .= "60" . str_pad(strlen($cidade), 2, "0", STR_PAD_LEFT) . $cidade;

    $campoAdicional = "05" . str_pad(strlen($txid), 2, "0", STR_PAD_LEFT) . $txid;
    $payload .= "62" . str_pad(strlen($campoAdicional), 2, "0", STR_PAD_LEFT) . $campoAdicional;

    $crc16 = gerarCRC16($payload);
    return $payload . "6304" . $crc16;
}

/**
 * Gera um QR Code PIX e retorna como uma imagem em Base64 para embutir em HTML.
 * Usa a biblioteca Endroid QR Code (instalada via Composer).
 * @param string $payload
 * @return string Data URI (data:image/png;base64,...)
 */
function gerarQRCodeBase64($payload) {
    try {
        if (class_exists('Endroid\QrCode\QrCode')) {
            $qrCode = new \Endroid\QrCode\QrCode(
                data: $payload,
                size: 200,
                margin: 5
            );
            $writer = new \Endroid\QrCode\Writer\PngWriter();
            $result = $writer->write($qrCode);
            return $result->getDataUri();
        }
        if (class_exists('QRcode')) {
            ob_start();
            \QRcode::png($payload, false, defined('QR_ECLEVEL_H') ? QR_ECLEVEL_H : 'H', 5, 2);
            $imageData = ob_get_contents();
            ob_end_clean();
            return 'data:image/png;base64,' . base64_encode($imageData);
        }
        return '';
    } catch (\Throwable $e) {
        return '';
    }
}
?>