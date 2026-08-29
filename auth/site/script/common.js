const API_BASE_URL = '../php';

/**
 * EliasTech Alerts - Custom Notification System
 */

// Inject basic modal structure when script loads
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('elias-alert-container')) {
        const modalHtml = `
        <div class="modal fade" id="elias-global-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content glass-card">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold" id="elias-modal-title">Aviso</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body py-4" id="elias-modal-body"></div>
                    <div class="modal-footer border-0 pt-0">
                        <button type="button" class="btn btn-secondary px-4" id="elias-modal-cancel" data-bs-dismiss="modal">Cancelar</button>
                        <button type="button" class="btn btn-primary px-4" id="elias-modal-confirm">Confirmar</button>
                    </div>
                </div>
            </div>
        </div>
        <div class="toast-container position-fixed top-0 end-0 p-3" id="elias-toast-container"></div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
});

/**
 * Show a custom alert (replaces alert())
 */
function showAlert(message, type = 'info', title = 'Aviso') {
    const modal = new bootstrap.Modal(document.getElementById('elias-global-modal'));
    const titleEl = document.getElementById('elias-modal-title');
    const bodyEl = document.getElementById('elias-modal-body');
    const confirmBtn = document.getElementById('elias-modal-confirm');
    const cancelBtn = document.getElementById('elias-modal-cancel');

    titleEl.textContent = title;
    bodyEl.innerHTML = message;
    
    cancelBtn.style.display = 'none';
    confirmBtn.textContent = 'OK';
    confirmBtn.onclick = () => modal.hide();

    modal.show();
}

/**
 * Show a custom confirmation (replaces confirm())
 */
function showConfirm(message, onConfirm, title = 'Confirmação') {
    const modal = new bootstrap.Modal(document.getElementById('elias-global-modal'));
    const titleEl = document.getElementById('elias-modal-title');
    const bodyEl = document.getElementById('elias-modal-body');
    const confirmBtn = document.getElementById('elias-modal-confirm');
    const cancelBtn = document.getElementById('elias-modal-cancel');

    titleEl.textContent = title;
    bodyEl.innerHTML = message;
    
    cancelBtn.style.display = 'block';
    confirmBtn.textContent = 'Confirmar';
    confirmBtn.onclick = () => {
        onConfirm();
        modal.hide();
    };

    modal.show();
}

/**
 * Show a modern toast notification
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('elias-toast-container');
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    const color = type === 'success' ? '#3da35a' : '#ff5e57';
    
    const toastHtml = `
    <div class="toast custom-toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-body d-flex align-items-center">
            <i class="fas ${icon} me-2" style="color: ${color}; font-size: 1.2rem;"></i>
            <div class="flex-grow-1">${message}</div>
            <button type="button" class="btn-close ms-2" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    </div>`;
    
    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = container.lastElementChild;
    const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
    toast.show();
    
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

/**
 * Pergunta se o usuário deseja incluir a 2ª página com formato NFSe
 * Retorna uma Promise que resolve em true (Sim, com NFSe) ou false (Apenas OS)
 */
function perguntarFormatoNfse() {
    return new Promise((resolve) => {
        const modalEl = document.getElementById('elias-global-modal');
        if (!modalEl) {
            // Fallback caso a modal não esteja presente
            resolve(window.confirm("Deseja gerar junto com o formato NFSe (Nota Fiscal)?"));
            return;
        }

        const modal = new bootstrap.Modal(modalEl);
        const titleEl = document.getElementById('elias-modal-title');
        const bodyEl = document.getElementById('elias-modal-body');
        const confirmBtn = document.getElementById('elias-modal-confirm');
        const cancelBtn = document.getElementById('elias-modal-cancel');

        titleEl.textContent = 'Formato de Impressão / PDF';
        bodyEl.innerHTML = `
            <div class="text-center py-2">
                <div class="mb-3">
                    <i class="fas fa-file-invoice-dollar fa-3x" style="color: #28a745;"></i>
                </div>
                <h6 class="fw-bold mb-2">Deseja gerar junto com o formato NFSe?</h6>
                <p class="text-muted small mb-0">Adiciona uma 2ª página estilizada no padrão DANFSe (Documento Auxiliar da NFS-e) com dados fiscais e autenticidade.</p>
            </div>
        `;

        cancelBtn.style.display = 'inline-block';
        cancelBtn.textContent = 'Não (Apenas OS)';
        cancelBtn.className = 'btn btn-outline-secondary px-3';
        
        confirmBtn.textContent = 'Sim (Com NFSe)';
        confirmBtn.className = 'btn btn-success px-4 fw-bold';

        let responded = false;

        const cleanup = () => {
            confirmBtn.className = 'btn btn-primary px-4';
            cancelBtn.className = 'btn btn-secondary px-4';
        };

        const onConfirm = () => {
            responded = true;
            cleanup();
            modal.hide();
            resolve(true);
        };

        const onCancel = () => {
            responded = true;
            cleanup();
            modal.hide();
            resolve(false);
        };

        confirmBtn.onclick = onConfirm;
        cancelBtn.onclick = onCancel;

        const hiddenHandler = () => {
            modalEl.removeEventListener('hidden.bs.modal', hiddenHandler);
            cleanup();
            if (!responded) resolve(false);
        };

        modalEl.addEventListener('hidden.bs.modal', hiddenHandler);
        modal.show();
    });
}