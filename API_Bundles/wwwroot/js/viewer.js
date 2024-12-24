// viewer.js

async function getAccessToken(callback) {
    try {
        const resp = await fetch('/api/auth/token');
        if (!resp.ok) {
            throw new Error(await resp.text());
        }
        const { access_token, expires_in } = await resp.json();
        callback(access_token, expires_in);
    } catch (err) {
        console.error('No se pudo obtener token:', err);
        alert('Error al obtener token APS. Ver consola.');
    }
}

function initViewer(container) {
    return new Promise((resolve, reject) => {
        Autodesk.Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, function () {
            const viewer = new Autodesk.Viewing.GuiViewer3D(container, { extensions: [] });
            viewer.start();
            viewer.setTheme('light-theme');
            resolve(viewer);
        });
    });
}

function loadModel(viewer, encodedUrn) {
    const docUrn = 'urn:' + encodedUrn;
    Autodesk.Viewing.Document.load(docUrn,
        doc => viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()),
        (code, msg) => {
            console.error('Error load model:', code, msg);
            alert('No se pudo cargar el modelo.');
        }
    );
}
