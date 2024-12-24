// wwwroot/js/daConfigure.js

$(document).ready(function () {
    // Cargar listas
    prepareLists();

    $('#clearAccount').click(async () => {
        const zipFileName = $('#localBundles').val();
        const fileName = zipFileName.split('.')[0];
        const activityName = fileName + 'Activity';
        const appBundleName = fileName + 'AppBundle';

        if (!confirm('¿Estás seguro de querer borrar AppBundle & Activity para este zip?'))
            return;

        try {
            updateConfigStatus('deleting_appbundle', appBundleName);
            await deleteAppBundle(appBundleName);

            updateConfigStatus('deleting_activity', activityName);
            await deleteActivity(activityName);

            updateConfigStatus('deleting_completed', appBundleName + ' & ' + activityName);
        } catch (err) {
            console.log(err);
            updateConfigStatus('deleting_failed', appBundleName + ' & ' + activityName);
        }
    });

    $('#defineActivityShow').click(() => {
        $("#defineActivityModal").modal();
    });

    $('#createAppBundleActivity').click(createAppBundleActivity);
});

function prepareLists() {
    list('engines', '/api/aps/designautomation/engines');
    list('localBundles', '/api/aps/appbundles');
}

function list(control, endpoint) {
    $('#' + control).find('option').remove().end();
    $.ajax({
        url: endpoint,
        dataType: 'json',
        success: function (items) {
            if (!items || items.length === 0) {
                $('#' + control).append($('<option>', { disabled: true, text: 'Nada encontrado' }));
            } else {
                items.forEach(function (item) {
                    $('#' + control).append($('<option>', { value: item, text: item }));
                });
            }
        }
    });
}

async function deleteAppBundle(appBundleName) {
    let def = $.Deferred();
    $.ajax({
        url: '/api/aps/designautomation/appbundles/' + encodeURIComponent(appBundleName),
        type: 'delete',
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

async function deleteActivity(activityName) {
    let def = $.Deferred();
    $.ajax({
        url: '/api/aps/designautomation/activities/' + encodeURIComponent(activityName),
        type: 'delete',
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

async function createAppBundleActivity() {
    const zipFileName = $('#localBundles').val();
    const fileName = zipFileName.split('.')[0];

    try {
        updateConfigStatus('creating_appbundle', fileName + 'AppBundle');
        await createAppBundle(fileName);

        updateConfigStatus('creating_activity', fileName + 'Activity');
        await createActivity(fileName);

        updateConfigStatus('creating_completed', fileName + 'AppBundle & ' + fileName + 'Activity');
    } catch (err) {
        console.log('Fallo al crear AppBundle y Activity.');
        updateConfigStatus('creating_failed', fileName + 'AppBundle & ' + fileName + 'Activity');
    }
}

function createAppBundle(fileName) {
    let def = $.Deferred();
    $.ajax({
        url: 'api/aps/designautomation/appbundles',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            fileName: fileName,
            engine: $('#engines').val()
        }),
        success: function (res) {
            def.resolve(res);
        },
        error: function (err) {
            def.reject(err);
        }
    });
    return def.promise();
}

function createActivity(fileName) {
    let def = $.Deferred();
    $.ajax({
        url: 'api/aps/designautomation/activities',
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            fileName: fileName,
            engine: $('#engines').val()
        }),
        success: function (res) {
            def.resolve(res);
        },
        error: function (err) {
            def.reject(err);
        }
    });
    return def.promise();
}

function updateConfigStatus(status, info) {
    let statusText = document.getElementById('configText');
    let createBtn = document.getElementById('createAppBundleActivity');
    let deleteBtn = document.getElementById('clearAccount');

    switch (status) {
        case 'creating_appbundle':
            setProgress(20, 'configProgressBar');
            statusText.innerHTML = '<h4>Paso 1/2: Creando AppBundle: ' + info + '</h4>';
            createBtn.disabled = true;
            deleteBtn.disabled = true;
            break;
        case 'creating_activity':
            setProgress(60, 'configProgressBar');
            statusText.innerHTML = '<h4>Paso 2/2: Creando Activity: ' + info + '</h4>';
            createBtn.disabled = true;
            deleteBtn.disabled = true;
            break;
        case 'creating_completed':
            setProgress(100, 'configProgressBar');
            statusText.innerHTML = '<h4>Creado: ' + info + '</h4>';
            createBtn.disabled = false;
            deleteBtn.disabled = false;
            break;
        case 'creating_failed':
            setProgress(0, 'configProgressBar');
            statusText.innerHTML = '<h4>Fallo al crear: ' + info + '</h4>';
            createBtn.disabled = false;
            deleteBtn.disabled = false;
            break;

        case 'deleting_appbundle':
            setProgress(20, 'configProgressBar');
            statusText.innerHTML = '<h4>Paso 1/2: Borrando AppBundle: ' + info + '</h4>';
            createBtn.disabled = true;
            deleteBtn.disabled = true;
            break;
        case 'deleting_activity':
            setProgress(60, 'configProgressBar');
            statusText.innerHTML = '<h4>Paso 2/2: Borrando Activity: ' + info + '</h4>';
            createBtn.disabled = true;
            deleteBtn.disabled = true;
            break;
        case 'deleting_completed':
            setProgress(100, 'configProgressBar');
            statusText.innerHTML = '<h4>Borrado: ' + info + '</h4>';
            createBtn.disabled = false;
            deleteBtn.disabled = false;
            break;
        case 'deleting_failed':
            setProgress(0, 'configProgressBar');
            statusText.innerHTML = '<h4>Fallo al borrar: ' + info + '</h4>';
            createBtn.disabled = false;
            deleteBtn.disabled = false;
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
