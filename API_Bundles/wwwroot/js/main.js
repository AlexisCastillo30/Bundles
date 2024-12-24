// main.js
document.addEventListener('DOMContentLoaded', async () => {
    // Botones
    const signInBtn = document.getElementById('autodeskSigninButton');
    const signOutBtn = document.getElementById('autodeskSignOutButton');
    const userInfo = document.getElementById('userInfo');
    const refreshTree = document.getElementById('refreshTree');

    try {
        // 1) Checar si el usuario está logueado
        const resp = await fetch('/api/auth/profile');
        if (resp.ok) {
            // === Logueado ===
            const profile = await resp.json();
            signInBtn.hidden = true;
            signOutBtn.hidden = false;
            userInfo.innerText = `(${profile.name})`;
            refreshTree.style.display = 'inline-block';

            // Handler de SignOut
            signOutBtn.addEventListener('click', () => {
                // Llamamos a /api/auth/logout (o la lógica que tengas)
                window.location.href = '/api/auth/logout';
            });

            // 2) Inicializar Visor
            const viewerContainer = document.getElementById('apsViewer');
            window.myGlobalViewer = await initViewer(viewerContainer);

            // 3) Inicializar Árbol
            initTree('#tree', (versionUrn) => {
                // Lógica de "al hacer clic en versión"
                loadModel(window.myGlobalViewer, btoa(versionUrn).replace(/=/g, ''));
            });

            // Handler de refrescar árbol
            refreshTree.addEventListener('click', () => {
                initTree('#tree', (versionUrn) => {
                    loadModel(window.myGlobalViewer, btoa(versionUrn).replace(/=/g, ''));
                }, true);
            });
        } else {
            // === No logueado ===
            signInBtn.hidden = false;
            signOutBtn.hidden = true;
            signInBtn.addEventListener('click', () => {
                window.location.href = '/api/auth/login';
            });
        }
    } catch (err) {
        console.error('Error en main.js:', err);
        alert('No se pudo inicializar la aplicación.');
    }
});