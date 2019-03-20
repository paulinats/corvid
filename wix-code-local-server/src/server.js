const initLocalSiteManager = require("@wix/wix-code-local-site");

const setupSocketServer = require("./server/setupSocketServer");

const editorSocketApi = require("./socket-api/editorSocketHandler");
const adminSocketApi = require("./socket-api/adminSocketHandler");

const DEFAULT_EDITOR_PORT = 5000;
const DEFAULT_ADMIN_PORT = 3000;

async function startServer(siteRootPath, isCloneMode) {
  // TODO:: add src folder to path ?
  const localSite = await initLocalSiteManager(siteRootPath);

  if (isCloneMode && !(await localSite.isEmpty())) {
    localSite.close();
    throw new Error("CAN_NOT_CLONE_NON_EMPTY_SITE");
  }

  if (!isCloneMode && (await localSite.isEmpty())) {
    localSite.close();
    throw new Error("CAN_NOT_EDIT_EMPTY_SITE");
  }

  const editorServer = setupSocketServer();
  const adminServer = setupSocketServer();

  const serverState = {
    // TODO: properly handle state
    isCloneMode: () => isCloneMode,
    editorPort: () => editorPort,
    adminPort: () => adminPort,
    isEditorConnected: () =>
      Object.keys(editorServer.io.sockets.connected).length > 0
  };

  const editorSocketHandler = editorSocketApi(localSite);
  editorServer.io.on("connection", editorSocketHandler);

  const adminSocketHandler = adminSocketApi(serverState);
  adminServer.io.on("connection", adminSocketHandler);

  const editorPort = await editorServer.listen(DEFAULT_EDITOR_PORT);
  const adminPort = await adminServer.listen(DEFAULT_ADMIN_PORT);

  return {
    port: editorPort,
    adminPort: adminPort,
    close: () => {
      localSite.close();
      editorServer.close();
      adminServer.close();
    }
  };
}

const startInCloneMode = siteRootPath => startServer(siteRootPath, true);

const startInEditMode = siteRootPath => startServer(siteRootPath, false);

module.exports = {
  startInCloneMode,
  startInEditMode
};
