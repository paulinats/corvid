const initLocalSiteManager = require("@wix/wix-code-local-site");

const startSocketServer = require("./server/startSocketServer");

const initServerApi = require("./socket-api");

const DEFAULT_EDITOR_PORT = 5000;
const DEFAULT_ADMIN_PORT = 3000;

async function startServer(siteRootPath, loadedInCloneMode) {
  // TODO:: add src folder to path ?
  const localSite = await initLocalSiteManager(siteRootPath);

  if (loadedInCloneMode && !(await localSite.isEmpty())) {
    localSite.close();
    throw new Error("CAN_NOT_CLONE_NON_EMPTY_SITE");
  }

  if (!loadedInCloneMode && (await localSite.isEmpty())) {
    localSite.close();
    throw new Error("CAN_NOT_EDIT_EMPTY_SITE");
  }

  const editorServer = await startSocketServer(DEFAULT_EDITOR_PORT);
  const adminServer = await startSocketServer(DEFAULT_ADMIN_PORT);

  initServerApi(localSite, adminServer, editorServer, loadedInCloneMode);

  // eslint-disable-next-line no-console
  console.log(
    `Server started in ${
      loadedInCloneMode ? "clone" : "edit"
    } mode. Listening on ${editorServer.port}`
  );

  return {
    port: editorServer.port,
    adminPort: adminServer.port,
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
