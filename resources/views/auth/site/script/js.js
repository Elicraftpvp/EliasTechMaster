document.addEventListener('DOMContentLoaded', function() {
    
    // Ativar o link da sidebar correspondente à página atual
    const setActiveLink = () => {
        const path = window.location.pathname.split("/").pop();
        if (path === '' || path === 'index.html') {
            document.querySelector('.sidebar .nav-link[href="index.html"]')?.classList.add('active');
        } else {
            const activeLink = document.querySelector(`.sidebar .nav-link[href="${path}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }
    };

    setActiveLink();

    // Lógica para a página de Abrir OS
    if (document.getElementById('os-form')) {
        const servicosTableBody = document.getElementById('servicos-selecionados-body');
        const adicionarServicoBtn = document.getElementById('adicionar-servico');
        const servicoSelect = document.getElementById('servico-select');
        const valorExtraInput = document.getElementById('valor_extra');
        const totalElement = document.getElementById('total-os');

        const servicosDisponiveis = {
            "1": { nome: "Formatação de Computador", valor: 120.00 },
            "2": { nome: "Limpeza de Hardware", valor: 80.00 },
            "3": { nome: "Troca de Tela de Notebook", valor: 350.00 },
            "4": { nome: "Instalação de Software", valor: 50.00 }
        };

        const updateTotals = () => {
            let total = 0;
            const rows = servicosTableBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const qtdInput = row.querySelector('.qtd-servico');
                const valorUnitario = parseFloat(row.querySelector('td:nth-child(3)').innerText.replace('R$ ', ''));
                const qtd = parseInt(qtdInput.value) || 0;
                const subtotal = qtd * valorUnitario;
                row.querySelector('.subtotal').innerText = `R$ ${subtotal.toFixed(2)}`;
                total += subtotal;
            });
            
            const valorExtra = parseFloat(valorExtraInput.value) || 0;
            total += valorExtra;

            totalElement.innerText = `R$ ${total.toFixed(2)}`;
        };

        adicionarServicoBtn.addEventListener('click', () => {
            const selectedId = servicoSelect.value;
            if (!selectedId) return;

            const servico = servicosDisponiveis[selectedId];
            
            // Evita adicionar o mesmo serviço duas vezes
            if(document.querySelector(`tr[data-id="${selectedId}"]`)) {
                alert('Este serviço já foi adicionado.');
                return;
            }

            const newRow = document.createElement('tr');
            newRow.setAttribute('data-id', selectedId);
            newRow.innerHTML = `
                <td>${servico.nome}</td>
                <td><input type="number" class="form-control form-control-sm qtd-servico" value="1" min="1"></td>
                <td>R$ ${servico.valor.toFixed(2)}</td>
                <td class="subtotal">R$ ${servico.valor.toFixed(2)}</td>
                <td><button type="button" class="btn btn-danger btn-sm remover-servico">X</button></td>
            `;
            servicosTableBody.appendChild(newRow);
            updateTotals();
        });

        servicosTableBody.addEventListener('click', (e) => {
            if (e.target.classList.contains('remover-servico')) {
                e.target.closest('tr').remove();
                updateTotals();
            }
        });
        
        servicosTableBody.addEventListener('input', (e) => {
            if (e.target.classList.contains('qtd-servico')) {
                updateTotals();
            }
        });

        valorExtraInput.addEventListener('input', updateTotals);
    }
});
document.addEventListener('DOMContentLoaded', function() {
    
    // Lógica para marcar o item do menu como 'ativo' ao clicar
    const sidebarLinks = document.querySelectorAll('.sidebar .nav-link');

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Remove a classe 'active' de todos os links
            sidebarLinks.forEach(item => item.classList.remove('active'));
            
            // Adiciona a classe 'active' apenas no link clicado
            this.classList.add('active');
        });
    });

    // A lógica do formulário de OS continua a mesma,
    // mas ela só vai funcionar quando a página abrir_os.html for carregada no iframe.
    // O ideal é mover essa lógica para um script separado e chamá-lo apenas em abrir_os.html
    // ou manter aqui, pois ela não dará erro nas outras páginas.
    if (document.getElementById('os-form')) {
        // ... (mantenha o código original do formulário de OS aqui) ...
    }
});