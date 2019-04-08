/* eslint-disable no-console */
const path = require("path");
const chalk = require("chalk");
const init = require("../apps/init");
const { login } = require("./login");
const { pull } = require("./pull");
const createSpinner = require("../utils/spinner");
const sessionData = require("../utils/sessionData");
const { sendInitEvent } = require("../utils/bi");

async function initHandler(args) {
  const spinner = createSpinner();
  sessionData.on(["msid", "uuid"], (msid, uuid) => sendInitEvent(msid, uuid));
  return login(spinner)
    .then(async cookie => {
      if (cookie) {
        const projectDir = await init(spinner, args, cookie);
        await pull(spinner, {
          C: projectDir,
          ignoreCertificate: args.ignoreCertificate
        });

        spinner.stop();
        await sessionData.callWithKeys(
          (msid, uuid) => sendInitEvent(msid, uuid, "success"),
          "msid",
          "uuid"
        );
        return `Initialisation complete, change directory to '${path.resolve(
          projectDir
        )}' and run 'corvid open-editor' to start editing the local copy`;
      } else {
        throw new Error("Login failed");
      }
    })
    .catch(async error => {
      await sessionData.callWithKeys(
        (msid, uuid) => sendInitEvent(msid, uuid, "fail"),
        "msid",
        "uuid"
      );

      throw error;
    });
}

module.exports = {
  command: "init <url> [dir]",
  describe: "intializes a local Wix Site copy",
  builder: args =>
    args
      .positional("url", { describe: "Public site URL", type: "string" })
      .positional("dir", {
        describe: "local directory to download data to",
        type: "string"
      })
      .option("ignore-certificate", {
        describe: "ignore certificate errors",
        type: "boolean"
      }),
  handler: args =>
    initHandler(args).then(
      message => {
        console.log(chalk.green(message));
        process.exit(0);
      },
      error => {
        if (error) {
          if (error.name === "FetchError") {
            console.log(chalk.red("Failed to retrieve site list"));
          } else if (error.message) {
            console.log(chalk.red(error.message));
          } else {
            console.log(error);
          }
        }
        process.exit(-1);
      }
    ),
  init: initHandler
};
