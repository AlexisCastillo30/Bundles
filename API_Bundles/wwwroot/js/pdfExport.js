// wwwroot/js/pdfExport.js

// Variables globales para rastrear la exportación
var sourceVersionUrn = null; // la versión/URN que se seleccionó
var workingItem = null;

// Al cargar la página, enganchamos handlers a los botones
$(document).ready(function () {
    // Botón Exportar PDF
    $('#startWorkitem').click(export2Pdf);

    // Botón Cancelar
    $('#cancelBtn').click(async function () {
        if (workingItem != null) {
            try {
                await cancelWorkitem(workingItem);
                console.log('La tarea se ha cancelado.');
            } catch (err) {
                console.log('Fallo al cancelar la tarea.');
            }
        }
    });
});

// Si usas Socket.io en tu servidor, puedes escuchar las notificaciones
// de 'Workitem-Notification', etc. Ajusta si tu backend está enviando esos eventos.
if (typeof io !== 'undefined') {
    const socketio = io();
    const SOCKET_TOPIC_WORKITEM = 'Workitem-Notification';

    socketio.on(SOCKET_TOPIC_WORKITEM, (data) => {
        if (workingItem === null || data.WorkitemId !== workingItem) return;

        const status = (data.Status || '').toLowerCase();
        updateStatus(status, data.ExtraInfo);

        // habilitar o deshabilitar botones según estado
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            workingItem = null;
        }
        if (status === 'completed') {
            console.log('Exportación PDF completada:', data);
        }
    });
}

// ------------------- Lógica principal -------------------

async function export2Pdf() {
    // Ver si hay una versión seleccionada
    // En tu InspireTree, cuando el usuario hace clic en un "version|..." 
    // se llama "onSelectionChanged" con tokens[1] => urnEncoded
    // Ajusta la variable 'sourceVersionUrn' para recordarla
    // Pero aquí haremos un approach simplificado: 
    // Toma la versión actual del globalViewer (NO siempre es lo ideal).
    // O pídela al user con tu own logic.

    // O, si deseas, en "sidebar.js" -> onSelectionChanged -> 
    // pdfExport.js -> setSourceVersion(urnEncoded) y guardas en sourceVersionUrn.
    // Para un ejemplo, supongamos que 'sourceVersionUrn' ya está guardado en la variable global 
    // al momento de hacer clic en la versión. 
    // Sino, asume que "globalViewer.model?.myUrn" etc. 
    // Aquí es un placeholder.
    if (!sourceVersionUrn) {
        alert('Selecciona primero una versión de Revit (versión) en el árbol.');
        return;
    }

    // Checa si es un .rvt
    // Notas: tu backend tal vez verifique si se trata de un Revit 
    // o podrías filtrar en la UI. 
    // Aquí simplificamos.

    const drawingSheet = $('#drawingSheet')[0].checked;
    const threeD = $('#threeD')[0].checked;
    const detail = $('#detail')[0].checked;
    const elevation = $('#elevation')[0].checked;
    const floorPlan = $('#floorPlan')[0].checked;
    const section = $('#section')[0].checked;
    const rendering = $('#rendering')[0].checked;

    if (!drawingSheet && !threeD && !detail && !elevation && !floorPlan && !section && !rendering) {
        alert('Selecciona al menos un tipo de vista para exportar.');
        return;
    }

    const inputJson = {
        DrawingSheet: drawingSheet,
        ThreeD: threeD,
        Detail: detail,
        Elevation: elevation,
        FloorPlan: floorPlan,
        Section: section,
        Rendering: rendering
    };

    try {
        updateStatus('started');
        const res = await exportToPdfs(sourceVersionUrn, inputJson);
        console.log('Se inició la exportación a PDF. Respuesta: ', res);
        workingItem = res.workItemId;
        updateStatus(res.workItemStatus);
    } catch (err) {
        console.error('Fallo al exportar a PDF:', err);
        updateStatus('failed');
    }
}

async function exportToPdfs(urn, inputJson) {
    // Envía la petición a tu backend. Ajusta la ruta.
    // Por ejemplo: /api/aps/da4revit/v1/revit/<URN>/pdfs
    // En tu 2do snippet usabas:
    //    url: '/api/aps/da4revit/v1/revit/' + encodeURIComponent(inputRvt) + '/pdfs'
    // Asegúrate de tener un endpoint real que maneje esto.
    // Aquí fingimos que existe '/api/aps/da4revit/v1/revit/...'

    let def = $.Deferred();
    $.ajax({
        url: '/api/aps/da4revit/v1/revit/' + encodeURIComponent(urn) + '/pdfs',
        contentType: 'application/json',
        dataType: 'json',
        data: inputJson,
        success: function (res) {
            def.resolve(res);
        },
        error: function (err) {
            def.reject(err);
        }
    });
    return def.promise();
}

async function cancelWorkitem(workitemId) {
    let def = $.Deferred();
    if (!workitemId) {
        def.reject('workitemId no válido');
        return def.promise();
    }
    $.ajax({
        url: '/api/aps/da4revit/v1/revit/' + encodeURIComponent(workitemId),
        type: 'DELETE',
        dataType: 'json',
        success: function (res) {
            def.resolve(res);
        },
        error: function (err) {
            def.reject(err);
        }
    });
    return def.promise();
}

// ------------------- updateStatus -------------------
function updateStatus(status, extraInfo = '') {
    let statusText = document.getElementById('statusText');
    let exportBtn = document.getElementById('startWorkitem');
    let cancelBtn = document.getElementById('cancelBtn');

    switch (status) {
        case 'started':
            setProgress(20, 'parametersUpdateProgressBar');
            statusText.innerHTML = '<h4>Paso 1/3: Subiendo información de vistas...</h4>';
            exportBtn.disabled = true;
            cancelBtn.disabled = true;
            break;
        case 'pending':
        case 'inprogress':
            setProgress(40, 'parametersUpdateProgressBar');
            statusText.innerHTML = '<h4>Paso 2/3: Ejecutando Design Automation...</h4>';
            exportBtn.disabled = true;
            cancelBtn.disabled = false;
            break;
        case 'success':
            setProgress(80, 'parametersUpdateProgressBar');
            statusText.innerHTML = '<h4>Paso 3/4: Creando una nueva versión del PDF...</h4>';
            exportBtn.disabled = true;
            cancelBtn.disabled = true;
            break;
        case 'completed':
            setProgress(100, 'parametersUpdateProgressBar');
            statusText.innerHTML = '<h4>Paso 3/3: ¡Hecho! <a href="' + extraInfo + '">Descargar PDF</a></h4>';
            exportBtn.disabled = false;
            cancelBtn.disabled = true;
            break;
        case 'failed':
            setProgress(0, 'parametersUpdateProgressBar');
            statusText.innerHTML = '<h4>Falló la exportación a PDF</h4>';
            exportBtn.disabled = false;
            cancelBtn.disabled = true;
            break;
        case 'cancelled':
            setProgress(0, 'parametersUpdateProgressBar');
            statusText.innerHTML = '<h4>La operación fue cancelada</h4>';
            exportBtn.disabled = false;
            cancelBtn.disabled = true;
            break;
        default:
            // para cualquier otro status
            break;
    }
}

function setProgress(percent, progressbarId) {
    let progressBar = document.getElementById(progressbarId);
    progressBar.style.width = percent + '%';
    if (percent === 100) {
        progressBar.parentElement.className = 'progress progress-striped';
    } else if (percent > 0) {
        progressBar.parentElement.className = 'progress progress-striped active';
    } else {
        progressBar.parentElement.className = 'progress progress-striped active';
        progressBar.style.width = '0%';
    }
}
