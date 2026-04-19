document.addEventListener('DOMContentLoaded', () => {
    const pixForm = document.getElementById('pix-form');
    const btnSalvar = document.getElementById('btn-salvar-pix');

    // Carregar configurações atuais
    const carregarPix = async () => {
        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=pix`);
            const data = await response.json();
            
            if (data) {
                document.getElementById('pix_chave').value = data.pix_chave || '';
                document.getElementById('pix_nome').value = data.pix_nome || '';
                document.getElementById('pix_cidade').value = data.pix_cidade || '';
            }
        } catch (error) {
            console.error('Erro ao carregar PIX:', error);
        }
    };

    // Salvar configurações
    pixForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            tipo: 'pix',
            pix_chave: document.getElementById('pix_chave').value,
            pix_nome: document.getElementById('pix_nome').value,
            pix_cidade: document.getElementById('pix_cidade').value
        };

        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...';

        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=pix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();

            if (result.success) {
                alert('Configurações de PIX salvas com sucesso!');
            } else {
                alert('Erro ao salvar: ' + result.message);
            }
        } catch (error) {
            alert('Erro de comunicação com o servidor.');
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Configurações';
        }
    });

    carregarPix();
});
