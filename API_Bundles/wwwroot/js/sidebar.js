// sidebar.js
async function initTree(selector, onSelectionChanged, forceReload = false) {
    if (forceReload && window.myInspireTree) {
        document.querySelector(selector).innerHTML = '';
        window.myInspireTree = null;
    }

    const tree = new InspireTree({
        data: async function (node) {
            if (!node || !node.id) {
                // === Se piden Hubs ===
                const hubs = await getJSON('/api/hubs');
                if (!Array.isArray(hubs)) return [];
                // Transformar hubs en nodos InspireTree
                return hubs.map(hub => createNode(`hub|${hub.id}`, hub.name, 'icon-hub', true));
            } else {
                const tokens = node.id.split('|');
                switch (tokens[0]) {
                    case 'hub': {
                        // GET /api/hubs/{hubId}/projects
                        const projects = await getJSON(`/api/hubs/${tokens[1]}/projects`);
                        if (!Array.isArray(projects)) return [];
                        return projects.map(p => createNode(`project|${tokens[1]}|${p.id}`, p.name, 'icon-project', true));
                    }
                    case 'project': {
                        // GET /api/hubs/{hubId}/projects/{projectId}/contents
                        const hubId = tokens[1];
                        const projectId = tokens[2];
                        const contents = await getJSON(`/api/hubs/${hubId}/projects/${projectId}/contents`);
                        if (!Array.isArray(contents)) return [];
                        return contents.map(item => {
                            if (item.folder) {
                                return createNode(`folder|${hubId}|${projectId}|${item.id}`, item.name, 'icon-my-folder', true);
                            } else {
                                return createNode(`item|${hubId}|${projectId}|${item.id}`, item.name, 'icon-item', true);
                            }
                        });
                    }
                    case 'folder': {
                        // GET /api/hubs/{hubId}/projects/{projId}/contents?folder_id=xxx
                        const [_, hubId, projId, folderId] = tokens;
                        const folderContents = await getJSON(`/api/hubs/${hubId}/projects/${projId}/contents?folder_id=${folderId}`);
                        if (!Array.isArray(folderContents)) return [];
                        return folderContents.map(item => {
                            if (item.folder) {
                                return createNode(`folder|${hubId}|${projId}|${item.id}`, item.name, 'icon-my-folder', true);
                            } else {
                                return createNode(`item|${hubId}|${projId}|${item.id}`, item.name, 'icon-item', true);
                            }
                        });
                    }
                    case 'item': {
                        // GET /api/hubs/{hubId}/projects/{projId}/contents/{itemId}/versions
                        const [_, hubId, projId, itemId] = tokens;
                        const versions = await getJSON(`/api/hubs/${hubId}/projects/${projId}/contents/${itemId}/versions`);
                        if (!Array.isArray(versions)) return [];
                        return versions.map(ver =>
                            createNode(`version|${ver.id}`, ver.name, 'icon-version', false)
                        );
                    }
                    default:
                        return [];
                }
            }
        }
    });

    // Al hacer clic en un nodo
    tree.on('node.click', (event, node) => {
        event.preventTreeDefault();
        const tokens = node.id.split('|');
        if (tokens[0] === 'version') {
            // Llamar callback con la "version id"
            onSelectionChanged(tokens[1]);
        }
    });

    window.myInspireTree = new InspireTreeDOM(tree, { target: selector });
}

function createNode(id, text, icon, children = false) {
    return { id, text, children, itree: { icon } };
}

async function getJSON(url) {
    try {
        const resp = await fetch(url);
        if (!resp.ok) {
            console.warn('Request falló:', url, resp.status, await resp.text());
            return [];
        }
        return await resp.json();
    } catch (err) {
        console.error('Error fetch:', url, err);
        return [];
    }
}
