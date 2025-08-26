<?php
// Evita cache no navegador
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

/**
 * =======================================================================
 * MUDANÇA PRINCIPAL: REMOVEMOS O COMPOSER E USAMOS A NOVA BIBLIOTECA
 * =======================================================================
 * 1. Incluímos diretamente o arquivo da biblioteca PHP QR Code.
 *    Não precisamos mais da pasta 'vendor' ou do 'autoload.php'.
 */
require __DIR__ . '/phpqrcode/qrlib.php';

// ---------- FUNÇÕES PIX (sem alterações) ----------
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

function gerarCodigoPIX($chave, $nome, $cidade, $valor = null, $txid = '***') {
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

// ---------- DADOS PARA TESTE ----------
$chave = "+5548998339706";
$nome = "ELIAS GUSTAVO KERSTEN";
$cidade = "SAO PAULO";
$valor = 10.00;
$descricao = "OS" . rand(100, 999);

// Gera o payload PIX
$codigoPIX = gerarCodigoPIX($chave, $nome, $cidade, $valor, $descricao);

// Exibe o código "copia e cola"
echo "<h3>Código PIX (Copia e Cola):</h3>";
echo "<textarea readonly onclick='this.select();'>$codigoPIX</textarea>";

/**
 * =======================================================================
 * MUDANÇA PRINCIPAL: NOVA LÓGICA DE GERAÇÃO DO QR CODE
 * =======================================================================
 */
try {
    // 2. Inicia o "buffer de saída". Isso captura tudo que seria impresso na tela.
    ob_start();

    // 3. Gera o QR Code. A função QRcode::png() com o segundo parâmetro 'false'
    //    imprime a imagem diretamente, que será capturada pelo buffer.
    //    Parâmetros: (texto, arquivo_saida, correção_erro, tamanho_pixel, margem)
    QRcode::png($codigoPIX, false, QR_ECLEVEL_H, 8, 2);

    // 4. Pega os dados da imagem que foram capturados no buffer.
    $imageData = ob_get_contents();

    // 5. Limpa e desliga o buffer.
    ob_end_clean();

    // 6. Converte os dados da imagem para base64 e cria o Data URI.
    $dataUri = 'data:image/png;base64,' . base64_encode($imageData);

    // 7. Exibe a imagem no HTML.
    echo "<h3>QR Code:</h3><img src='$dataUri' alt='QR Code PIX'>";

} catch (Exception $e) {
    echo "<h3>Erro ao gerar QR Code:</h3>";
    echo "<p>Não foi possível gerar o QR Code. Detalhes: " . htmlspecialchars($e->getMessage()) . "</p>";
}
?>