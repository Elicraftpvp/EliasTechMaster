document.addEventListener('DOMContentLoaded', () => {
    const formNfse = document.getElementById('form-nfse-config');
    const btnSalvar = document.getElementById('salvar-nfse-btn');

    const fields = [
        'nfse_empresa_nome', 'nfse_cnpj_cpf', 'nfse_inscricao_municipal',
        'nfse_endereco', 'nfse_municipio', 'nfse_uf', 'nfse_cep',
        'nfse_telefone', 'nfse_email', 'nfse_regime_tributario',
        'nfse_codigo_tributacao', 'nfse_desc_tributacao', 'nfse_garantia_dias'
    ];

    // Carregar configurações atuais
    const carregarConfigNfse = async () => {
        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php?tipo=nfse`);
            if (!response.ok) throw new Error('Erro ao buscar dados da empresa.');
            
            const config = await response.json();

            if (config && typeof config === 'object') {
                fields.forEach(field => {
                    const el = document.getElementById(field);
                    if (el && config[field] !== undefined) {
                        el.value = config[field];
                    }
                });
            }
        } catch (error) {
            console.error('Falha ao carregar dados da empresa/NFSe:', error);
            showAlert('Não foi possível carregar as configurações da empresa.', 'error', 'Erro');
        }
    };

    // Salvar configurações
    const salvarConfigNfse = async (e) => {
        e.preventDefault();
        btnSalvar.disabled = true;
        btnSalvar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Salvando...';

        const data = {
            _method: 'PUT',
            tipo: 'nfse'
        };

        fields.forEach(field => {
            const el = document.getElementById(field);
            if (el) {
                data[field] = el.value.trim();
            }
        });

        try {
            const response = await fetch(`../${API_BASE_URL}/configuracoes_api.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Erro ao salvar dados.');
            }

            showToast('Dados da empresa e NFS-e atualizados com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            showAlert(`Falha ao salvar: ${error.message}`, 'error', 'Erro');
        } finally {
            btnSalvar.disabled = false;
            btnSalvar.innerHTML = '<i class="fas fa-save me-2"></i>Salvar Dados da Empresa e NFS-e';
        }
    };

    formNfse.addEventListener('submit', salvarConfigNfse);
    carregarConfigNfse();
});
