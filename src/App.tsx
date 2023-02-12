import { useEffect, useState } from "react";
import "./App.css";
import { Command } from "@tauri-apps/api/shell";
import { invoke } from "@tauri-apps/api/tauri";
import Downloads from "./components/Downloads";
import Settings from "./components/Settings";
import {
  BaseDirectory,
  createDir,
  writeTextFile,
  readTextFile,
  exists,
} from "@tauri-apps/api/fs";
import { appConfigDir, downloadDir } from "@tauri-apps/api/path";
function App() {
  const [currentTab, setTab] = useState<number>(0);
  const [config, setConfig] = useState<{
    ffmpegPath?: string;
    downloadPath?: string;
  }>({
    ffmpegPath: "",
    downloadPath: "",
  });
  async function checkFFmpegInstallation() {
    const downloadDirPath = await downloadDir();

    const appConfigDirPath = await appConfigDir();
    const configDirExists = await exists(appConfigDirPath);
    console.log(configDirExists);
    if (!configDirExists) {
      await createDir(appConfigDirPath, {
        dir: BaseDirectory.AppConfig,
      });
    }
    const configFileExists = await exists("config.json", {
      dir: BaseDirectory.AppConfig,
    });
    if (configFileExists) {
      const contents = await readTextFile("config.json", {
        dir: BaseDirectory.AppConfig,
      });
      const parsed: { ffmpegPath?: string; downloadPath?: string } =
        JSON.parse(contents);
      setConfig(parsed);
      console.log(config);
      if (parsed.downloadPath === "" && parsed.ffmpegPath === "") {
        const command = new Command("check-ffmpeg", ["-a", "ffmpeg"]);
        const output = await command.execute();
        const { stdout, stderr } = output;
        console.log(stdout);
        if (stderr) {
          setConfig({ ffmpegPath: "", downloadPath: downloadDirPath });
        } else if (stdout) {
          setConfig({
            ffmpegPath: stdout.split("ffmpeg")[0] + "ffmpeg",
            downloadPath: downloadDirPath,
          });
        }
        updateConfig(config);
      }
    }
  }

  useEffect(() => {
    checkFFmpegInstallation();
    setTimeout(() => {
      invoke("close_splashscreen");
    }, 3000);
    document.addEventListener("contextmenu", (event) => event.preventDefault());
  }, []);

  async function updateConfig(config: {
    ffmpegPath?: string;
    downloadPath?: string;
  }) {
    setConfig(config);
    await writeTextFile(
      {
        path: "config.json",
        contents: JSON.stringify({
          downloadPath: config.downloadPath,
          ffmpegPath: config.ffmpegPath,
        }),
      },
      { dir: BaseDirectory.AppConfig }
    );
  }

  const activeTabClasses =
    "bg-transparent hover:bg-gray-200 text-white hover:text-black";
  const tabClasses =
    "border transition-all cursor-pointer w-1/2 flex justify-center rounded-bl-lg rounded-tl-lg rounded-l-lg p-2";
  const inactiveTabClasses = "bg-gray-200 text-black";
  return (
    <div className="h-screen dark:bg-gray-700 p-5">
      <div className="flex flex-col justify-between">
        <div className="flex flex-col  justify-center items-center gap-2">
          <div className="flex text-xs rounded-lg border border-gray-600">
            <div
              onClick={() => setTab(0)}
              className={`${tabClasses} ${
                currentTab === 0 ? inactiveTabClasses : activeTabClasses
              }`}
            >
              Downloads
            </div>

            <div
              onClick={() => setTab(1)}
              className={`border transition-all cursor-pointer w-1/2 flex justify-center  rounded-br-lg rounded-tr-lg rounded-r-lg p-2 ${
                currentTab === 1 ? inactiveTabClasses : activeTabClasses
              }`}
            >
              Settings
            </div>
          </div>
          {currentTab === 0 ? (
            <Downloads config={config} />
          ) : (
            <Settings config={config} updateConfig={updateConfig} />
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
