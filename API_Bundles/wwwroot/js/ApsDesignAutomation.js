// wwwroot/js/ApsDesignAutomation.js

$(document).ready(function () {
    // Al cargar la página
    prepareLists();

    // Botones de "configurar" (AppBundle & Activity)
    $("#defineActivityShow").click(() => {
        $("#defineActivityModal").modal();
    });
    $("#createAppBundleActivity").click(createAppBundleActivity);

    // Botón "Eliminar todo"
    $("#clearAccount").click(clearAccount);

    // Botón "Exportar PDF"
    $("#startWorkitem").click(startWorkitem);

    // Inicia la conexión SignalR (si deseas log en vivo)
    startConnection();
});

// 1) Cargar la lista de Activities, Engines y Bundles
function prepareLists() {
    list("engines", "/api/aps/designautomation/engines");
    list("localBundles", "/api/appbundles");
    list("activity", "/api/aps/designautomation/activities");
}

function list(control, endpoint) {
    $("#" + control).empty(); // limpiar combo
    $.ajax({
        url: endpoint,
        success: function (list) {
            if (!list || list.length === 0) {
                $("#" + control).append($("<option>", { disabled: true, text: "Nada encontrado" }));
            } else {
                list.forEach(function (item) {
                    $("#" + control).append($("<option>", { value: item, text: item }));
                });
            }
        },
        error: function (err) {
            console.warn("Error en " + endpoint, err);
        }
    });
}

// 2) Eliminar ("clearAccount") => /api/aps/designautomation/account
function clearAccount() {
    if (!confirm("¿Estás seguro de borrar activities & appbundles?")) return;

    $.ajax({
        url: "api/aps/designautomation/account",
        method: "DELETE",
        success: function () {
            writeLog("Cuenta limpiada, se borraron appbundles & activities");
            prepareLists();
        },
        error: function (err) {
            writeLog("Error al limpiar cuenta: " + JSON.stringify(err));
        }
    });
}

// 3) Modal "Crear AppBundle & Activity"
function createAppBundleActivity() {
    startConnection(function () {
        writeLog("Creando AppBundle & Activity para engine: " + $("#engines").val());
        $("#defineActivityModal").modal("toggle");

        createAppBundle(function () {
            createActivity(function () {
                prepareLists();
            });
        });
    });
}

function createAppBundle(onDone) {
    $.ajax({
        url: "api/aps/designautomation/appbundles",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            zipFileName: $("#localBundles").val(), // ej. "ExportToPdfsApp"
            engine: $("#engines").val()           // ej. "Autodesk.Revit+2023"
        }),
        success: function (res) {
            writeLog("AppBundle creado: " + JSON.stringify(res));
            if (onDone) onDone();
        },
        error: function (err) {
            writeLog("Error al crear AppBundle: " + JSON.stringify(err));
        }
    });
}

function createActivity(onDone) {
    $.ajax({
        url: "api/aps/designautomation/activities",
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({
            zipFileName: $("#localBundles").val(), // Ej. "ExportToPdfsApp"
            engine: $("#engines").val()           // "Autodesk.Revit+2023"
        }),
        success: function (res) {
            writeLog("Activity creada: " + JSON.stringify(res));
            if (onDone) onDone();
        },
        error: function (err) {
            writeLog("Error al crear Activity: " + JSON.stringify(err));
        }
    });
}

// 4) startWorkitem => sube Revit + booleans (DrawingSheet, etc.)
function startWorkitem() {
    // Validar input
    let inputFileField = document.getElementById("inputFile");
    if (!inputFileField || inputFileField.files.length === 0) {
        alert("Selecciona un archivo Revit");
        return;
    }
    if ($("#activity").val() === null) {
        alert("Selecciona una Activity");
        return;
    }

    // Leer checkboxes
    let drawingSheet = $("#drawingSheet")[0].checked;
    let threeD = $("#threeD")[0].checked;
    let detail = $("#detail")[0].checked;
    let elevation = $("#elevation")[0].checked;
    let floorPlan = $("#floorPlan")[0].checked;
    let section = $("#section")[0].checked;
    let rendering = $("#rendering")[0].checked;

    let file = inputFileField.files[0];

    startConnection(function () {
        let formData = new FormData();
        formData.append("inputFile", file);

        // Empaquetar data JSON
        formData.append("data", JSON.stringify({
            drawingSheet: drawingSheet,
            threeD: threeD,
            detail: detail,
            elevation: elevation,
            floorPlan: floorPlan,
            section: section,
            rendering: rendering,
            activityName: $("#activity").val(),
            browserConnectionId: connectionId // para SignalR
        }));

        writeLog("Subiendo archivo Revit y lanzando WorkItem...");

        $.ajax({
            url: "api/aps/designautomation/workitems",
            processData: false,
            contentType: false,
            data: formData,
            type: "POST",
            success: function (res) {
                writeLog("Workitem iniciado: " + JSON.stringify(res));
            },
            error: function (err) {
                writeLog("Error Workitem: " + JSON.stringify(err));
            }
        });
    });
}

// 5) Log y SignalR
function writeLog(text) {
    $("#outputlog").append(<div style="border-top: 1px dashed #C0C0C0">${text}</div>);
    let elem = document.getElementById("outputlog");
    elem.scrollTop = elem.scrollHeight;
}

var connection;
var connectionId;

function startConnection(onReady) {
    // Evitar reconectar si ya existe
    if (connection && connection.connectionState === "Connected") {
        if (onReady) onReady();
        return;
    }

    // Iniciar SignalR
    connection = new signalR.HubConnectionBuilder()
        .withUrl("/api/signalr/designautomation") // Ajusta si tu Startup.cs mapeó otra ruta
        .build();

    connection.start().then(function () {
        connection.invoke("getConnectionId").then(function (id) {
            connectionId = id;
            if (onReady) onReady();
        });
    });

    // Mensajes recibidos
    connection.on("downloadResult", function (url) {
        writeLog(<a href="${url}" target="_blank">Descargar PDF aquí</a>);
    });

    connection.on("onComplete", function (message) {
        writeLog(message);
    });
}